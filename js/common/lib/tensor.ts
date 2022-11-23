// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {Tensor as TensorImpl} from './tensor-impl';
import {TypedTensorUtils} from './tensor-utils';
/// <reference lib="dom" />
/* eslint-disable @typescript-eslint/no-redeclare */

/**
 * represent a basic tensor with specified dimensions and data type.
 */
interface TypedTensorBase<T extends Tensor.Type> {
  /**
   * Get the dimensions of the tensor.
   */
  readonly dims: readonly number[];
  /**
   * Get the data type of the tensor.
   */
  readonly type: T;
  /**
   * Get the buffer data of the tensor.
   */
  readonly data: Tensor.DataTypeMap[T];
}

export declare namespace Tensor {
  interface DataTypeMap {
    float32: Float32Array;
    uint8: Uint8Array;
    int8: Int8Array;
    uint16: Uint16Array;
    int16: Int16Array;
    int32: Int32Array;
    int64: BigInt64Array;
    string: string[];
    bool: Uint8Array;
    float16: never;  // hold on using Uint16Array before we have a concrete solution for float 16
    float64: Float64Array;
    uint32: Uint32Array;
    uint64: BigUint64Array;
    // complex64: never;
    // complex128: never;
    // bfloat16: never;
  }

  interface ElementTypeMap {
    float32: number;
    uint8: number;
    int8: number;
    uint16: number;
    int16: number;
    int32: number;
    int64: bigint;
    string: string;
    bool: boolean;
    float16: never;  // hold on before we have a concret solution for float 16
    float64: number;
    uint32: number;
    uint64: bigint;
    // complex64: never;
    // complex128: never;
    // bfloat16: never;
  }

  type DataType = DataTypeMap[Type];
  type ElementType = ElementTypeMap[Type];

  /**
   * represent the data type of a tensor
   */
  export type Type = keyof DataTypeMap;
}

/**
 * Represent multi-dimensional arrays to feed to or fetch from model inferencing.
 */
export interface TypedTensor<T extends Tensor.Type> extends TypedTensorBase<T>, TypedTensorUtils<T> {}
/**
 * Represent multi-dimensional arrays to feed to or fetch from model inferencing.
 */
export interface Tensor extends TypedTensorBase<Tensor.Type>, TypedTensorUtils<Tensor.Type> {
  /**
   * construct an image from tensor
   *
   * @returns An ImageData type object which can be used to draw on canvas
   */
  toImage(): ImageData;
}

export interface TensorConstructor {
  // #region specify element type
  /**
   * Construct a new string tensor object from the given type, data and dims.
   *
   * @param type - Specify the element type.
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(type: 'string', data: Tensor.DataTypeMap['string']|readonly string[],
      dims?: readonly number[]): TypedTensor<'string'>;

  /**
   * Construct a new bool tensor object from the given type, data and dims.
   *
   * @param type - Specify the element type.
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(type: 'bool', data: Tensor.DataTypeMap['bool']|readonly boolean[], dims?: readonly number[]): TypedTensor<'bool'>;

  /**
   * Construct a new numeric tensor object from the given type, data and dims.
   *
   * @param type - Specify the element type.
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new<T extends Exclude<Tensor.Type, 'string'|'bool'>>(
      type: T, data: Tensor.DataTypeMap[T]|readonly number[], dims?: readonly number[]): TypedTensor<T>;
  // #endregion

  // #region infer element types

  /**
   * Construct a new float32 tensor object from the given data and dims.
   *
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(data: Float32Array, dims?: readonly number[]): TypedTensor<'float32'>;

  /**
   * Construct a new int8 tensor object from the given data and dims.
   *
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(data: Int8Array, dims?: readonly number[]): TypedTensor<'int8'>;

  /**
   * Construct a new uint8 tensor object from the given data and dims.
   *
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(data: Uint8Array, dims?: readonly number[]): TypedTensor<'uint8'>;

  /**
   * Construct a new uint16 tensor object from the given data and dims.
   *
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(data: Uint16Array, dims?: readonly number[]): TypedTensor<'uint16'>;

  /**
   * Construct a new int16 tensor object from the given data and dims.
   *
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(data: Int16Array, dims?: readonly number[]): TypedTensor<'int16'>;

  /**
   * Construct a new int32 tensor object from the given data and dims.
   *
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(data: Int32Array, dims?: readonly number[]): TypedTensor<'int32'>;

  /**
   * Construct a new int64 tensor object from the given data and dims.
   *
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(data: BigInt64Array, dims?: readonly number[]): TypedTensor<'int64'>;

  /**
   * Construct a new string tensor object from the given data and dims.
   *
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(data: readonly string[], dims?: readonly number[]): TypedTensor<'string'>;

  /**
   * Construct a new bool tensor object from the given data and dims.
   *
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(data: readonly boolean[], dims?: readonly number[]): TypedTensor<'bool'>;

  /**
   * Construct a new float64 tensor object from the given data and dims.
   *
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(data: Float64Array, dims?: readonly number[]): TypedTensor<'float64'>;

  /**
   * Construct a new uint32 tensor object from the given data and dims.
   *
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(data: Uint32Array, dims?: readonly number[]): TypedTensor<'uint32'>;

  /**
   * Construct a new uint64 tensor object from the given data and dims.
   *
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(data: BigUint64Array, dims?: readonly number[]): TypedTensor<'uint64'>;

  // #endregion

  // #region fall back to non-generic tensor type declaration

  /**
   * Construct a new tensor object from the given type, data and dims.
   *
   * @param type - Specify the element type.
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(type: Tensor.Type, data: Tensor.DataType|readonly number[]|readonly boolean[], dims?: readonly number[]): Tensor;

  /**
   * Construct a new tensor object from the given data and dims.
   *
   * @param data - Specify the tensor data
   * @param dims - Specify the dimension of the tensor. If omitted, a 1-D tensor is assumed.
   */
  new(data: Tensor.DataType, dims?: readonly number[]): Tensor;
  // #endregion
}
export interface TensorFactory {
  /**
   * construct a tensor from image object - HTMLImageElement, ImageData, ImageBitmap, URL
   *
   * @param image - ImageData Type - composeed of: Uint8ClampedArray, width. height - uses known pixel format RGBA
   * @returns A promise that resolves to a tensor object
   */
  fromImage(image: ImageData): Promise<Tensor>;

  /**
   * construct a tensor from image object - HTMLImageElement, ImageData, ImageBitmap, URL
   *
   * @param image - HTMLImageElement Type - since the data is stored as ImageData no need for format parameter
   * @returns A promise that resolves to a tensor object
   */
  fromImage(image: HTMLImageElement): Promise<Tensor>;

  /**
   * construct a tensor from image object - HTMLImageElement, ImageData, ImageBitmap, URL
   *
   * @param image - string - Asumming the string is a URL to an image
   * @returns A promise that resolves to a tensor object
   */
  fromImage(image: string): Promise<Tensor>;

  /**
   * construct a tensor from image object - HTMLImageElement, ImageData, ImageBitmap, URL
   *
   * @param image - HTMLImageElement Type - since the data is stored as ImageData no need for format parameter
   * @param format - string Type - since Imagebitmap doesn't have a standard format, this parameter is required
   * @returns A promise that resolves to a tensor object
   */
  fromImage(image: ImageBitmap, format?: 'rgb'|'rbg'|'rgba'): Promise<Tensor>;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Tensor = TensorImpl as TensorConstructor;
