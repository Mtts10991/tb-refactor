/**
 * @fileoverview
 * Unit tests สำหรับ HTTP services ที่เหลือ (10 services)
 * — ใช้ HttpClientCaptor เพื่อ verify URL + method ของแต่ละ method
 * Coverage target: tenant, asset, entity-view, edge, queue, attribute,
 *   audit-log, component-descriptor, calculated-fields, admin, notification,
 *   asset-profile, device-profile, oauth2, ota-package, resource, rule-chain,
 *   widget, image, mobile-app, mobile-application, domain, two-factor-auth,
 *   api-key, ai-model, git-hub, trendz-settings, ui-settings, usage-info,
 *   user-settings, alarm-comment, entities-version-control, entity-relation,
 *   entity.service
 */

import { describe, it, expect, beforeEach } from "vitest";
import { HttpClientCaptor } from "../parity/http-client-captor";
import { MockPageLink, SAMPLE_UUID_1 } from "../parity/test-helpers";

// Services imports (relative paths to avoid alias resolution issues)
import { TenantService } from "../../src/core/http/services/tenant.service";
import { AssetService } from "../../src/core/http/services/asset.service";
import { EntityViewService } from "../../src/core/http/services/entity-view.service";
import { EdgeService } from "../../src/core/http/services/edge.service";
import { QueueService } from "../../src/core/http/services/queue.service";
import { ComponentDescriptorService } from "../../src/core/http/services/component-descriptor.service";
import { AssetProfileService } from "../../src/core/http/services/asset-profile.service";
import { DeviceProfileService } from "../../src/core/http/services/device-profile.service";
import { OAuth2Service } from "../../src/core/http/services/oauth2.service";
import { DomainService } from "../../src/core/http/services/domain.service";
import { ApiKeyService } from "../../src/core/http/services/api-key.service";
import { AiModelService } from "../../src/core/http/services/ai-model.service";
import { EventService } from "../../src/core/http/services/event.service";
import { GitHubService } from "../../src/core/http/services/git-hub.service";
import { TrendzSettingsService } from "../../src/core/http/services/trendz-settings.service";
import { UiSettingsService } from "../../src/core/http/services/ui-settings.service";
import { UsageInfoService } from "../../src/core/http/services/usage-info.service";
import { AlarmCommentService } from "../../src/core/http/services/alarm-comment.service";
import { MobileAppService } from "../../src/core/http/services/mobile-app.service";
import { MobileApplicationService } from "../../src/core/http/services/mobile-application.service";

// Helper: สร้าง service + captor
function setupService<T>(
  ServiceClass: new (httpClient: unknown, ...args: unknown[]) => T,
  extraDeps: unknown[] = [],
): { service: T; captor: HttpClientCaptor } {
  const captor = new HttpClientCaptor();
  const service = new ServiceClass(captor.asHttpClient() as any, ...extraDeps);
  return { service, captor };
}

// ============================================================
// TenantService
// ============================================================
describe("TenantService unit", () => {
  it("getTenants → GET /api/tenants", () => {
    const { service, captor } = setupService(TenantService);
    service.getTenants(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.url).toContain("/api/tenants");
  });
  it("getTenant → GET /api/tenant/{id}", () => {
    const { service, captor } = setupService(TenantService);
    service.getTenant(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.url).toBe(`/api/tenant/${SAMPLE_UUID_1}`);
  });
  it("saveTenant → POST /api/tenant", () => {
    const { service, captor } = setupService(TenantService);
    service.saveTenant({ title: "T" } as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
  it("deleteTenant → DELETE", () => {
    const { service, captor } = setupService(TenantService);
    service.deleteTenant(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.method).toBe("DELETE");
  });
});

// ============================================================
// AssetService
// ============================================================
describe("AssetService unit", () => {
  it("getAsset → GET /api/asset/{id}", () => {
    const { service, captor } = setupService(AssetService);
    service.getAsset(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.url).toBe(`/api/asset/${SAMPLE_UUID_1}`);
  });
  it("saveAsset → POST /api/asset", () => {
    const { service, captor } = setupService(AssetService);
    service.saveAsset({ name: "A" } as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
  it("deleteAsset → DELETE", () => {
    const { service, captor } = setupService(AssetService);
    service.deleteAsset(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.method).toBe("DELETE");
  });
});

// ============================================================
// EntityViewService
// ============================================================
describe("EntityViewService unit", () => {
  it("getEntityView → GET /api/entityView/{id}", () => {
    const { service, captor } = setupService(EntityViewService);
    service.getEntityView(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.url).toBe(`/api/entityView/${SAMPLE_UUID_1}`);
  });
  it("saveEntityView → POST", () => {
    const { service, captor } = setupService(EntityViewService);
    service.saveEntityView({ name: "EV" } as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
});

// ============================================================
// EdgeService
// ============================================================
describe("EdgeService unit", () => {
  it("getEdge → GET /api/edge/{id}", () => {
    const { service, captor } = setupService(EdgeService);
    service.getEdge(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.url).toBe(`/api/edge/${SAMPLE_UUID_1}`);
  });
  it("saveEdge → POST", () => {
    const { service, captor } = setupService(EdgeService);
    service.saveEdge({ name: "E" } as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
});

// ============================================================
// QueueService
// ============================================================
describe("QueueService unit", () => {
  it("getQueueById → GET /api/queues/{id}", () => {
    const { service, captor } = setupService(QueueService);
    service.getQueueById(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.url).toContain("/api/queues");
  });
  it("getQueueByName → GET /api/tenant/queues", () => {
    const { service, captor } = setupService(QueueService);
    service.getQueueByName("main").subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});

// ============================================================
// ComponentDescriptorService
// ============================================================
describe("ComponentDescriptorService unit", () => {
  it("getComponentDescriptorsByType → GET /api/components", () => {
    const { service, captor } = setupService(ComponentDescriptorService);
    service.getComponentDescriptorsByType("FILTER" as any).subscribe();
    expect(captor.getLastCall()?.url).toContain("/api/components");
  });
});

// ============================================================
// AssetProfileService
// ============================================================
describe("AssetProfileService unit", () => {
  it("getAssetProfiles → GET /api/assetProfiles", () => {
    const { service, captor } = setupService(AssetProfileService);
    service.getAssetProfiles(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.url).toContain("/api/assetProfiles");
  });
  it("getAssetProfile → GET /api/assetProfile/{id}", () => {
    const { service, captor } = setupService(AssetProfileService);
    service.getAssetProfile(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.url).toBe(`/api/assetProfile/${SAMPLE_UUID_1}`);
  });
  it("saveAssetProfile → POST", () => {
    const { service, captor } = setupService(AssetProfileService);
    service.saveAssetProfile({ name: "AP" } as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
});

// ============================================================
// DeviceProfileService (needs OtaPackageService dep)
// ============================================================
describe("DeviceProfileService unit", () => {
  it("getDeviceProfiles → GET /api/deviceProfiles", () => {
    const { service, captor } = setupService(DeviceProfileService, [{} as any]);
    service.getDeviceProfiles(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.url).toContain("/api/deviceProfiles");
  });
  it("getDeviceProfile → GET /api/deviceProfile/{id}", () => {
    const { service, captor } = setupService(DeviceProfileService, [{} as any]);
    service.getDeviceProfile(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.url).toBe(`/api/deviceProfile/${SAMPLE_UUID_1}`);
  });
});

// ============================================================
// OAuth2Service
// ============================================================
describe("OAuth2Service unit", () => {
  it("findTenantOAuth2ClientInfos → GET", () => {
    const { service, captor } = setupService(OAuth2Service);
    service.findTenantOAuth2ClientInfos(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
  it("saveOAuth2Client → POST", () => {
    const { service, captor } = setupService(OAuth2Service);
    service.saveOAuth2Client({} as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
});

// ============================================================
// DomainService
// ============================================================
describe("DomainService unit", () => {
  it("getTenantDomainInfos → GET", () => {
    const { service, captor } = setupService(DomainService);
    service.getTenantDomainInfos(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
  it("getDomainInfoById → GET", () => {
    const { service, captor } = setupService(DomainService);
    service.getDomainInfoById(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});

// ============================================================
// ApiKeyService
// ============================================================
describe("ApiKeyService unit", () => {
  it("saveApiKey → POST", () => {
    const { service, captor } = setupService(ApiKeyService);
    service.saveApiKey({} as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
  it("deleteApiKey → DELETE", () => {
    const { service, captor } = setupService(ApiKeyService);
    service.deleteApiKey(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.method).toBe("DELETE");
  });
});

// ============================================================
// AiModelService
// ============================================================
describe("AiModelService unit", () => {
  it("getAiModels → GET", () => {
    const { service, captor } = setupService(AiModelService);
    service.getAiModels(new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});

// ============================================================
// EventService
// ============================================================
describe("EventService unit", () => {
  it("getEvents → GET /api/events", () => {
    const { service, captor } = setupService(EventService);
    // EventService.getEvents signature: (entityId, eventType, tenantId, pageLink, config)
    service.getEvents({ entityType: "DEVICE", id: SAMPLE_UUID_1 } as any, "LC_EVENT" as any, SAMPLE_UUID_1, new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.url).toContain("/api/events");
  });
});

// ============================================================
// GitHubService
// ============================================================
describe("GitHubService unit", () => {
  it("getGitHubStar → GET (external API)", () => {
    const { service, captor } = setupService(GitHubService);
    service.getGitHubStar().subscribe();
    // GitHub API เป็น external URL (https://api.github.com/repos/thingsboard/thingsboard)
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});

// ============================================================
// TrendzSettingsService
// ============================================================
describe("TrendzSettingsService unit", () => {
  it("getTrendzSettings → GET", () => {
    const { service, captor } = setupService(TrendzSettingsService);
    service.getTrendzSettings().subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});

// ============================================================
// UiSettingsService
// ============================================================
describe("UiSettingsService unit", () => {
  it("getHelpBaseUrl → GET", () => {
    const { service, captor } = setupService(UiSettingsService);
    service.getHelpBaseUrl().subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});

// ============================================================
// UsageInfoService
// ============================================================
describe("UsageInfoService unit", () => {
  it("getUsageInfo → GET", () => {
    const { service, captor } = setupService(UsageInfoService);
    service.getUsageInfo().subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});

// ============================================================
// AlarmCommentService
// ============================================================
describe("AlarmCommentService unit", () => {
  it("saveAlarmComment → POST", () => {
    const { service, captor } = setupService(AlarmCommentService);
    service.saveAlarmComment(SAMPLE_UUID_1, {} as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
  it("getAlarmComments → GET", () => {
    const { service, captor } = setupService(AlarmCommentService);
    service.getAlarmComments(SAMPLE_UUID_1, new MockPageLink() as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});

// ============================================================
// MobileAppService
// ============================================================
describe("MobileAppService unit", () => {
  it("saveMobileApp → POST", () => {
    const { service, captor } = setupService(MobileAppService);
    service.saveMobileApp({} as any).subscribe();
    expect(captor.getLastCall()?.method).toBe("POST");
  });
  it("getMobileAppInfoById → GET", () => {
    const { service, captor } = setupService(MobileAppService);
    service.getMobileAppInfoById(SAMPLE_UUID_1).subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});

// ============================================================
// MobileApplicationService (actually QrCodeSettings service)
// ============================================================
describe("MobileApplicationService unit", () => {
  it("getMobileAppSettings → GET", () => {
    const { service, captor } = setupService(MobileApplicationService);
    service.getMobileAppSettings().subscribe();
    expect(captor.getLastCall()?.method).toBe("GET");
  });
});
