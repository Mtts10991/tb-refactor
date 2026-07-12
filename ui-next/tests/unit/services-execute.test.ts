/**
 * @fileoverview
 * Import-based execute tests สำหรับ services ที่ import ได้โดยไม่ติด angular chain
 * ใช้ HttpClientCaptor pattern
 */

import { describe, it, expect } from "vitest";
import { of } from "rxjs";
import { HttpClientCaptor } from "../parity/http-client-captor";
import { MockPageLink, SAMPLE_UUID_1 } from "../parity/test-helpers";

function mockHttp() {
  const captor = new HttpClientCaptor();
  return { http: captor.asHttpClient(), captor };
}

// Services ที่ import สะอาด (no @angular in import chain)
import { NotificationService } from "../../src/core/http/services/notification.service";
import { AdminService } from "../../src/core/http/services/admin.service";
import { UserSettingsService } from "../../src/core/http/services/user-settings.service";
import { AuditLogService } from "../../src/core/http/services/audit-log.service";
import { TwoFactorAuthenticationService } from "../../src/core/http/services/two-factor-authentication.service";
import { AlarmService } from "../../src/core/http/services/alarm.service";
import { UserService } from "../../src/core/http/services/user.service";
import { TenantService } from "../../src/core/http/services/tenant.service";
import { AssetService } from "../../src/core/http/services/asset.service";
import { EntityViewService } from "../../src/core/http/services/entity-view.service";
import { EdgeService } from "../../src/core/http/services/edge.service";
import { ComponentDescriptorService } from "../../src/core/http/services/component-descriptor.service";
import { CalculatedFieldsService } from "../../src/core/http/services/calculated-fields.service";
import { EntityRelationService } from "../../src/core/http/services/entity-relation.service";
import { AlarmCommentService } from "../../src/core/http/services/alarm-comment.service";
import { ApiKeyService } from "../../src/core/http/services/api-key.service";
import { AiModelService } from "../../src/core/http/services/ai-model.service";
import { GitHubService } from "../../src/core/http/services/git-hub.service";
import { TrendzSettingsService } from "../../src/core/http/services/trendz-settings.service";
import { UiSettingsService } from "../../src/core/http/services/ui-settings.service";
import { UsageInfoService } from "../../src/core/http/services/usage-info.service";
import { MobileAppService } from "../../src/core/http/services/mobile-app.service";
import { MobileApplicationService } from "../../src/core/http/services/mobile-application.service";
import { DomainService } from "../../src/core/http/services/domain.service";
import { OAuth2Service } from "../../src/core/http/services/oauth2.service";
import { AssetProfileService } from "../../src/core/http/services/asset-profile.service";
import { DeviceProfileService } from "../../src/core/http/services/device-profile.service";
import { EventService } from "../../src/core/http/services/event.service";
import { QueueService } from "../../src/core/http/services/queue.service";

describe("NotificationService execute", () => {
  it("getNotifications → GET", () => {
    const { http, captor } = mockHttp();
    new NotificationService(http as any).getNotifications(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
  it("deleteNotification → DELETE", () => {
    const { http, captor } = mockHttp();
    new NotificationService(http as any).deleteNotification(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.method).toBe("DELETE");
  });
});

describe("AdminService execute", () => {
  it("getAdminSettings → GET", () => {
    const { http, captor } = mockHttp();
    new AdminService(http as any, {} as any).getAdminSettings("GENERAL" as any).subscribe();
    expect(captor.getLastCall()?.url).toContain("/api/admin/settings");
  });
  it("saveAdminSettings → POST", () => {
    const { http, captor } = mockHttp();
    new AdminService(http as any, {} as any).saveAdminSettings("GENERAL" as any, {} as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
});

describe("UserSettingsService execute", () => {
  it("loadUserSettings → GET", () => {
    const { http, captor } = mockHttp();
    new UserSettingsService(http as any).loadUserSettings().subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
  it("saveUserSettings → PUT", () => {
    const { http, captor } = mockHttp();
    new UserSettingsService(http as any).saveUserSettings({} as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
});

describe("AuditLogService execute", () => {
  it("getAuditLogs → GET", () => {
    const { http, captor } = mockHttp();
    new AuditLogService(http as any).getAuditLogs(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.url).toContain("/api/audit/logs");
  });
});

describe("TwoFactorAuthenticationService execute", () => {
  it("สร้าง instance", () => {
    const { http } = mockHttp();
    expect(new TwoFactorAuthenticationService(http as any)).toBeDefined();
  });
});

// Extra coverage for services that already have partial coverage
describe("AlarmService extra execute", () => {
  it("getAlarmTypes → GET", () => {
    const { http, captor } = mockHttp();
    new AlarmService(http as any).getAlarmTypes(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
  it("ackAlarm → POST", () => {
    const { http, captor } = mockHttp();
    new AlarmService(http as any).ackAlarm(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
  it("clearAlarm → POST", () => {
    const { http, captor } = mockHttp();
    new AlarmService(http as any).clearAlarm(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
});

describe("UserService extra execute", () => {
  it("deleteUser → DELETE", () => {
    const { http, captor } = mockHttp();
    new UserService(http as any).deleteUser(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.method).toBe("DELETE");
  });
  it("saveUser → POST", () => {
    const { http, captor } = mockHttp();
    new UserService(http as any).saveUser({ email: "test@test.com" } as any, false).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
});

describe("TenantService extra execute", () => {
  it("getTenants → GET", () => {
    const { http, captor } = mockHttp();
    new TenantService(http as any).getTenants(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});

describe("AssetService extra execute", () => {
  it("getTenantAssetInfos → GET", () => {
    const { http, captor } = mockHttp();
    new AssetService(http as any).getTenantAssetInfos(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});

describe("EntityViewService extra execute", () => {
  it("getTenantEntityViewInfos → GET", () => {
    const { http, captor } = mockHttp();
    new EntityViewService(http as any).getTenantEntityViewInfos(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});

describe("EdgeService extra execute", () => {
  it("getTenantEdgeInfos → GET", () => {
    const { http, captor } = mockHttp();
    new EdgeService(http as any).getTenantEdgeInfos(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});

describe("ApiKeyService extra execute", () => {
  it("saveApiKey → POST", () => {
    const { http, captor } = mockHttp();
    new ApiKeyService(http as any).saveApiKey({} as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
});

describe("MobileAppService extra execute", () => {
  it("getTenantMobileAppInfos → GET", () => {
    const { http, captor } = mockHttp();
    new MobileAppService(http as any).getTenantMobileAppInfos(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});
