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
import { AssetProfile, AssetProfileInfo } from '@shared/models/asset.models';
import { EntityInfoData } from '@shared/models/entity.models';
import { isDefinedAndNotNull } from '@core/utils';

export class AssetProfileService {

  constructor(public readonly httpClient: HttpClient
  ) {
  }

  public getAssetProfiles(pageLink: PageLink, config?: RequestConfig): Observable<PageData<AssetProfile>> {
    return this.httpClient.get<PageData<AssetProfile>>(`/api/assetProfiles${pageLink.toQuery()}`, defaultHttpOptionsFromConfig(config));
  }

  public getAssetProfilesByIds(assetProfileIds: Array<string>, config?: RequestConfig): Observable<Array<AssetProfileInfo>> {
    return this.httpClient.get<Array<AssetProfileInfo>>(`/api/assetProfileInfos?assetProfileIds=${assetProfileIds.join(',')}`,
      defaultHttpOptionsFromConfig(config));
  }

  public getAssetProfile(assetProfileId: string, config?: RequestConfig): Observable<AssetProfile> {
    return this.httpClient.get<AssetProfile>(`/api/assetProfile/${assetProfileId}`, defaultHttpOptionsFromConfig(config));
  }

  public exportAssetProfile(assetProfileId: string, config?: RequestConfig): Observable<AssetProfile> {
    return this.httpClient.get<AssetProfile>(`/api/assetProfile/${assetProfileId}?inlineImages=true`, defaultHttpOptionsFromConfig(config));
  }

  public saveAssetProfile(assetProfile: AssetProfile, config?: RequestConfig): Observable<AssetProfile> {
    return this.httpClient.post<AssetProfile>('/api/assetProfile', assetProfile, defaultHttpOptionsFromConfig(config));
  }

  public deleteAssetProfile(assetProfileId: string, config?: RequestConfig) {
    return this.httpClient.delete(`/api/assetProfile/${assetProfileId}`, defaultHttpOptionsFromConfig(config));
  }

  public setDefaultAssetProfile(assetProfileId: string, config?: RequestConfig): Observable<AssetProfile> {
    return this.httpClient.post<AssetProfile>(`/api/assetProfile/${assetProfileId}/default`, defaultHttpOptionsFromConfig(config));
  }

  public getDefaultAssetProfileInfo(config?: RequestConfig): Observable<AssetProfileInfo> {
    return this.httpClient.get<AssetProfileInfo>('/api/assetProfileInfo/default', defaultHttpOptionsFromConfig(config));
  }

  public getAssetProfileInfo(assetProfileId: string, config?: RequestConfig): Observable<AssetProfileInfo> {
    return this.httpClient.get<AssetProfileInfo>(`/api/assetProfileInfo/${assetProfileId}`, defaultHttpOptionsFromConfig(config));
  }

  public getAssetProfileInfos(pageLink: PageLink, config?: RequestConfig): Observable<PageData<AssetProfileInfo>> {
    return this.httpClient.get<PageData<AssetProfileInfo>>(`/api/assetProfileInfos${pageLink.toQuery()}`, defaultHttpOptionsFromConfig(config));
  }

  public getAssetProfileNames(activeOnly: boolean = false, config?: RequestConfig): Observable<Array<EntityInfoData>> {
    let url = '/api/assetProfile/names';
    if (isDefinedAndNotNull(activeOnly)) {
      url += `?activeOnly=${activeOnly}`;
    }
    return this.httpClient.get<Array<EntityInfoData>>(url, defaultHttpOptionsFromConfig(config));
  }

}
