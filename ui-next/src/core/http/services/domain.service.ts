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

import { defaultHttpOptionsFromConfig, RequestConfig } from '@core/http/http-utils';
import { HttpClient } from '../http-client';
import { Observable } from 'rxjs';
import { Domain, DomainInfo } from '@shared/models/oauth2.models';
import { PageLink } from '@shared/models/page/page-link';
import { PageData } from '@shared/models/page/page-data';

export class DomainService {

  constructor(public readonly httpClient: HttpClient
  ) {
  }

  public saveDomain(domain: Domain, oauth2ClientIds?: Array<string>, config?: RequestConfig): Observable<Domain> {
    let url = '/api/domain';
    if (oauth2ClientIds?.length) {
      url += `?oauth2ClientIds=${oauth2ClientIds.join(',')}`;
    }
    return this.httpClient.post<Domain>(url, domain, defaultHttpOptionsFromConfig(config));
  }

  public updateOauth2Clients(id: string, oauth2ClientIds: Array<string>, config?: RequestConfig): Observable<void> {
    return this.httpClient.put<void>(`/api/domain/${id}/oauth2Clients`, oauth2ClientIds, defaultHttpOptionsFromConfig(config));
  }

  public getTenantDomainInfos(pageLink: PageLink, config?: RequestConfig): Observable<PageData<DomainInfo>> {
    return this.httpClient.get<PageData<DomainInfo>>(`/api/domain/infos${pageLink.toQuery()}`, defaultHttpOptionsFromConfig(config));
  }

  public getDomainInfoById(id: string, config?: RequestConfig): Observable<DomainInfo> {
    return this.httpClient.get<DomainInfo>(`/api/domain/info/${id}`, defaultHttpOptionsFromConfig(config));
  }

  public deleteDomain(id: string, config?: RequestConfig): Observable<void> {
    return this.httpClient.delete<void>(`/api/domain/${id}`, defaultHttpOptionsFromConfig(config));
  }

}
