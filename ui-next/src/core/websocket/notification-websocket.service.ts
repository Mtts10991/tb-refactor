/*
 * @fileoverview
 * DEPRECATED — merged into TelemetryWebsocketService (Phase 1.4)
 *
 * NotificationWebsocketService เดิมเป็น dead proxy ที่ delegate ทุกอย่างไป telemetry
 * จึง merge เข้า TelemetryWebsocketService โดยตรง
 */

// Re-export TelemetryWebsocketService สำหรับ backward compatibility
export { TelemetryWebsocketService as NotificationWebsocketService } from './telemetry-websocket.service';
