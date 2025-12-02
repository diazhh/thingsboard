/*
 * Copyright © 2024 GDT - Grupo de Desarrollo Tecnológico
 * Licensed under the Apache License, Version 2.0
 */

/**
 * Protocol Configuration Models
 * 
 * Defines interfaces and enums for protocol configuration in the Gateway.
 */

export enum ProtocolType {
  MODBUS_RTU = 'modbus_rtu',
  MODBUS_TCP = 'modbus_tcp',
  ENRAF_GPU = 'enraf_gpu',
  VAREC_MARKSPACE = 'varec_markspace'
}

export interface ProtocolInfo {
  type: ProtocolType;
  name: string;
  description: string;
  icon: string;
  supportsNetwork: boolean;
  supportsSerial: boolean;
}

export const PROTOCOL_INFO_MAP: Record<ProtocolType, ProtocolInfo> = {
  [ProtocolType.MODBUS_RTU]: {
    type: ProtocolType.MODBUS_RTU,
    name: 'Modbus RTU',
    description: 'Serial communication protocol for industrial devices',
    icon: 'device_hub',
    supportsNetwork: false,
    supportsSerial: true
  },
  [ProtocolType.MODBUS_TCP]: {
    type: ProtocolType.MODBUS_TCP,
    name: 'Modbus TCP',
    description: 'Network-based Modbus protocol over TCP/IP',
    icon: 'cloud_queue',
    supportsNetwork: true,
    supportsSerial: false
  },
  [ProtocolType.ENRAF_GPU]: {
    type: ProtocolType.ENRAF_GPU,
    name: 'Enraf GPU',
    description: 'Enraf radar device protocol via serial connection',
    icon: 'radar',
    supportsNetwork: false,
    supportsSerial: true
  },
  [ProtocolType.VAREC_MARKSPACE]: {
    type: ProtocolType.VAREC_MARKSPACE,
    name: 'Varec Mark/Space',
    description: 'Varec radar device protocol via serial connection',
    icon: 'radar',
    supportsNetwork: false,
    supportsSerial: true
  }
};

export interface ModbusRTUSettings {
  device: string;
  baudrate: number;
  bytesize: number;
  parity: 'N' | 'E' | 'O' | 'M' | 'S';
  stopbits: 1 | 1.5 | 2;
  timeout: number;
}

export interface ModbusTCPSettings {
  host: string;
  port: number;
  unitId: number;
  timeout: number;
}

export interface EnrafGPUSettings {
  device: string;
  baudrate: number;
  address: number;
  timeout: number;
}

export interface VarecMarkSpaceSettings {
  device: string;
  baudrate: number;
  address: number;
  timeout: number;
}

export type ProtocolSettings = 
  | ModbusRTUSettings 
  | ModbusTCPSettings 
  | EnrafGPUSettings 
  | VarecMarkSpaceSettings;

export interface ProtocolConfig {
  protocol: ProtocolType;
  settings: ProtocolSettings;
}

export interface ProtocolValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const BAUDRATE_OPTIONS = [4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];
export const PARITY_OPTIONS = ['N', 'E', 'O', 'M', 'S'];
export const STOPBITS_OPTIONS = [1, 1.5, 2];
