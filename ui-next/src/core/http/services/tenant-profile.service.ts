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

import { PageLink } from '@shared/models/page/page-link';
import { HttpClient } from '../http-client';
import { defaultHttpOptionsFromConfig, RequestConfig } from '../http-utils';
import { Observable } from 'rxjs';
import { PageData } from '@shared/models/page/page-data';
import { TenantProfile } from '@shared/models/tenant.model';
import { EntityInfoData } from '@shared/models/entity.models';
import { sortEntitiesByIds } from '@shared/models/base-data';
import { map } from 'rxjs/operators';

export class TenantProfileService {

  constructor(public readonly httpClient: HttpClient
  ) { }

  public getTenantProfiles(pageLink: PageLink, config?: RequestConfig): Observable<PageData<TenantProfile>> {
    return this.httpClient.get<PageData<TenantProfile>>(`/api/tenantProfiles${pageLink.toQuery()}`, defaultHttpOptionsFromConfig(config));
  }

  public getTenantProfile(tenantProfileId: string, config?: RequestConfig): Observable<TenantProfile> {
    return this.httpClient.get<TenantProfile>(`/api/tenantProfile/${tenantProfileId}`, defaultHttpOptionsFromConfig(config));
  }

  public saveTenantProfile(tenantProfile: TenantProfile, config?: RequestConfig): Observable<TenantProfile> {
    return this.httpClient.post<TenantProfile>('/api/tenantProfile', tenantProfile, defaultHttpOptionsFromConfig(config));
  }

  public deleteTenantProfile(tenantProfileId: string, config?: RequestConfig) {
    return this.httpClient.delete(`/api/tenantProfile/${tenantProfileId}`, defaultHttpOptionsFromConfig(config));
  }

  public setDefaultTenantProfile(tenantProfileId: string, config?: RequestConfig): Observable<TenantProfile> {
    return this.httpClient.post<TenantProfile>(`/api/tenantProfile/${tenantProfileId}/default`, defaultHttpOptionsFromConfig(config));
  }

  public getDefaultTenantProfileInfo(config?: RequestConfig): Observable<EntityInfoData> {
    return this.httpClient.get<EntityInfoData>('/api/tenantProfileInfo/default', defaultHttpOptionsFromConfig(config));
  }

  public getTenantProfileInfo(tenantProfileId: string, config?: RequestConfig): Observable<EntityInfoData> {
    return this.httpClient.get<EntityInfoData>(`/api/tenantProfileInfo/${tenantProfileId}`, defaultHttpOptionsFromConfig(config));
  }

  public getTenantProfileInfos(pageLink: PageLink, config?: RequestConfig): Observable<PageData<EntityInfoData>> {
    return this.httpClient.get<PageData<EntityInfoData>>(`/api/tenantProfileInfos${pageLink.toQuery()}`, defaultHttpOptionsFromConfig(config));
  }

  public getTenantProfilesByIds(tenantProfileIds: Array<string>, config?: RequestConfig): Observable<Array<EntityInfoData>> {
    return this.httpClient.get<Array<EntityInfoData>>(`/api/tenantProfiles?ids=${tenantProfileIds.join(',')}`,
      defaultHttpOptionsFromConfig(config)).pipe(
      map((tenantProfiles) => sortEntitiesByIds(tenantProfiles, tenantProfileIds))
    );
  }

}
