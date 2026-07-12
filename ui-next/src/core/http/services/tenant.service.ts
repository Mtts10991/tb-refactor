///
/// Copyright © 2016-2026 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import { defaultHttpOptionsFromConfig, RequestConfig } from '../http-utils';
import { HttpClient } from '../http-client';
import { Observable } from 'rxjs';
import { PageLink } from '@shared/models/page/page-link';
import { PageData } from '@shared/models/page/page-data';
import { Tenant, TenantInfo } from '@shared/models/tenant.model';

export class TenantService {

  constructor(public readonly httpClient: HttpClient
  ) { }

  public getTenants(pageLink: PageLink, config?: RequestConfig): Observable<PageData<Tenant>> {
    return this.httpClient.get<PageData<Tenant>>(`/api/tenants${pageLink.toQuery()}`, defaultHttpOptionsFromConfig(config));
  }

  public getTenantsByIds(tenantIds: Array<string>, config?: RequestConfig): Observable<Array<Tenant>> {
    return this.httpClient.get<Array<Tenant>>(`/api/tenants?tenantIds=${tenantIds.join(',')}`, defaultHttpOptionsFromConfig(config));
  }

  public getTenantInfos(pageLink: PageLink, config?: RequestConfig): Observable<PageData<TenantInfo>> {
    return this.httpClient.get<PageData<TenantInfo>>(`/api/tenantInfos${pageLink.toQuery()}`, defaultHttpOptionsFromConfig(config));
  }

  public getTenant(tenantId: string, config?: RequestConfig): Observable<Tenant> {
    return this.httpClient.get<Tenant>(`/api/tenant/${tenantId}`, defaultHttpOptionsFromConfig(config));
  }

  public getTenantInfo(tenantId: string, config?: RequestConfig): Observable<TenantInfo> {
    return this.httpClient.get<TenantInfo>(`/api/tenant/info/${tenantId}`, defaultHttpOptionsFromConfig(config));
  }

  public saveTenant(tenant: Tenant, config?: RequestConfig): Observable<Tenant> {
    return this.httpClient.post<Tenant>('/api/tenant', tenant, defaultHttpOptionsFromConfig(config));
  }

  public deleteTenant(tenantId: string, config?: RequestConfig) {
    return this.httpClient.delete(`/api/tenant/${tenantId}`, defaultHttpOptionsFromConfig(config));
  }

}
