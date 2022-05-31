// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

#pragma once

#include "core/providers/cuda/cuda_common.h"
#include "core/framework/stream_handles.h"
#include "core/providers/cuda/cuda_execution_provider.h"
#include "core/providers/cuda/cuda_fwd.h"
#include "core/platform/ort_mutex.h"

namespace onnxruntime {
namespace cuda {

// -----------------------------------------------------------------------
// Base class for CUDA kernels
// -----------------------------------------------------------------------
class CudaKernel : public OpKernel {
 public:
  explicit CudaKernel(const OpKernelInfo& info)
      : OpKernel(info),
        // Is this OK to have a non-const execution provider?
        provider_(const_cast<CUDAExecutionProvider*>(static_cast<const CUDAExecutionProvider*>(info.GetExecutionProvider()))) {
  }
  // make all the cuda kernels async
  bool IsAsync() const override {
    return true;
  }

  Status ComputeAsync(OpKernelContext* p_op_kernel_context, DoneCallback done) const ORT_MUST_USE_RESULT override {
    // !!!!
    // TODO: this is a tempoarary workaround
    // we set the stream when every compute start to avoid change signature of Stream()
    // this avoid change too much files so make our sync with master branch difficult.
    // Need to remove this hack when prepare PR.
    std::lock_guard<OrtMutex> lock(stream_mutex_);
    stream_ = static_cast<cudaStream_t>(p_op_kernel_context->GetComputeStream()->handle);

    // all of our cuda EP kernels are actually "async", as the "ComputeInternal" just launch kernels to cuda stream
    // although there might be some host code in ComputeInternal (like calculate shape / upload to gpu), but those
    // code shouldn't be blocking.
    auto s = ComputeInternal(p_op_kernel_context);
    // use this to precisely locate the node where CUDA failure comes from
    //  if (cudaSuccess != cudaDeviceSynchronize())
    //    __debugbreak();
    if (s.IsOK()) {
      auto err = cudaGetLastError();
      if (err != cudaSuccess) {
        return ORT_MAKE_STATUS(ONNXRUNTIME, FAIL, "CUDA error ", cudaGetErrorName(err), ":", cudaGetErrorString(err));
      }
    }
    // now launch the callback to cuda stream, so it will be executed when the kernel is DONE.
    DoneCallback* p = new DoneCallback(done);
    CUDA_CALL_THROW(cudaStreamAddCallback(Stream(), cudaStreamCallback, p, 0));
    return Status::OK();
  }

  Status Compute(OpKernelContext* p_op_kernel_context) const override {
    ORT_NOT_IMPLEMENTED(__FUNCTION__, " is not implemented");
  }

  virtual Status ComputeInternal(OpKernelContext* p_op_kernel_context) const = 0;

  template <typename T>
  inline IAllocatorUniquePtr<T> AllocateBufferOnCPUPinned(size_t count_or_bytes) const {
    AllocatorPtr allocator = provider_->GetAllocator(DEFAULT_CPU_ALLOCATOR_DEVICE_ID, OrtMemTypeCPU);
    if (!allocator)
      return nullptr;
    return IAllocator::MakeUniquePtr<T>(allocator, count_or_bytes);
  }

  template <typename T>
  inline IAllocatorUniquePtr<T> GetScratchBuffer(size_t count_or_bytes) const {
    return provider_->GetScratchBuffer<T>(count_or_bytes);
  }

  // Different from GetScratchBuffer which use IAllocator::Alloc() to allocate memory,
  // this GetTransientScratchBuffer will call IAllocator::Reserve() to allocate memory.
  // IAllocator::Reserve() optionally implement some allocation logic that by-passes any arena-based
  // logic (or similar for different allocator) that may be housed in the Alloc() implementation.
  template <typename T>
  inline IAllocatorUniquePtr<T> GetTransientScratchBuffer(size_t count_or_bytes) const {
    return provider_->GetTransientScratchBuffer<T>(count_or_bytes);
  }

  inline void AddDeferredReleaseCPUPtr(void* p) const {
    provider_->AddDeferredReleaseCPUPtr(p);
  }

  const cudaDeviceProp& GetDeviceProp() const { return provider_->GetDeviceProp(); }

  inline cudaStream_t Stream() const { 
    return stream_;
  }

  // To support cudaMemcpyAsync, the cpu memory should be allocated in pinned memory
  // and it can only be released after the copy has finished
  template <typename T>
  class CudaAsyncBuffer {
   public:
    CudaAsyncBuffer(const CudaKernel* op_kernel) : gpu_copy_(nullptr), count_(0), op_kernel_(op_kernel) {}

    CudaAsyncBuffer(const CudaKernel* op_kernel, size_t count) : CudaAsyncBuffer(op_kernel) {
      AllocCpuPtr(count);
    }

    CudaAsyncBuffer(const CudaKernel* op_kernel, const T& value, size_t count)
        : CudaAsyncBuffer(op_kernel, count) {
      T* p = CpuPtr();
      for (size_t i = 0; i != count; ++i) {
        *p++ = value;
      }
    }

    CudaAsyncBuffer(const CudaKernel* op_kernel, gsl::span<T const> vec) : CudaAsyncBuffer(op_kernel, vec.size()) {
      memcpy(CpuPtr(), vec.data(), vec.size() * sizeof(T));
    }

    void AllocCpuPtr(size_t count) {
      cpu_pinned_copy_ = op_kernel_->AllocateBufferOnCPUPinned<T>(count);
      if (cpu_pinned_copy_ == nullptr)
        throw std::runtime_error("alloc failed");
      count_ = count;
    }

    Status CopyToGpu() {
      if (cpu_pinned_copy_) {
        gpu_copy_ = op_kernel_->GetScratchBuffer<T>(count_);
        CUDA_RETURN_IF_ERROR(cudaMemcpyAsync(gpu_copy_.get(), cpu_pinned_copy_.get(), count_ * sizeof(T), cudaMemcpyHostToDevice, op_kernel_->Stream()));
        op_kernel_->AddDeferredReleaseCPUPtr(cpu_pinned_copy_.release());
      }
      return Status::OK();
    }

    T* CpuPtr() const {
      return cpu_pinned_copy_.get();
    }

    gsl::span<T> CpuSpan() const {
      return gsl::span<T>(CpuPtr(), count_);
    }

    T* GpuPtr() const {
      return gpu_copy_.get();
    }

    size_t count() const {
      return count_;
    }

   protected:
    IAllocatorUniquePtr<T> gpu_copy_;
    IAllocatorUniquePtr<T> cpu_pinned_copy_;
    size_t count_;
    const CudaKernel* op_kernel_;
  };

  inline cublasHandle_t CublasHandle() const {
    return provider_->PerThreadCublasHandle();
  }

  inline cudnnHandle_t CudnnHandle() const {
    return provider_->PerThreadCudnnHandle();
  }

 protected:
  template <typename T>
  inline const T* GetConstOnes(size_t count) const {
    return provider_->template GetConstOnes<T>(count);
  }

  inline Status CopyTensor(const Tensor& src, Tensor& dst) const {
    return Info().GetDataTransferManager().CopyTensor(src, dst);
  }

  inline int GetDeviceId() const { return provider_->GetDeviceId(); }

 private:
  CUDAExecutionProvider* provider_;
  // !!!!
  // TODO: this is a tempoarary workaround
  // Remove it before we PR this feature.
  mutable OrtMutex stream_mutex_;
  mutable cudaStream_t stream_;
};

}  // namespace cuda
}  // namespace onnxruntime
