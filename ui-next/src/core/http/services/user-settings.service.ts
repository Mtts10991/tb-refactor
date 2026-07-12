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

import { Observable } from 'rxjs';
import { HttpClient } from '../http-client';
import {
  DocumentationLink, DocumentationLinks,
  GettingStarted,
  initialUserSettings, QuickLinks, UserDashboardAction, UserDashboardsInfo,
  UserSettings,
  UserSettingsType
} from '@shared/models/user-settings.models';
import { map } from 'rxjs/operators';
import { defaultHttpOptionsFromConfig, RequestConfig } from '@core/http/http-utils';

export class UserSettingsService {

  constructor(public readonly httpClient: HttpClient
  ) {}

  public loadUserSettings(): Observable<UserSettings> {
    return this.httpClient.get<UserSettings>('/api/user/settings', defaultHttpOptionsFromConfig({ignoreLoading: true, ignoreErrors: true})).pipe(
      map((settings) => (!settings || !Object.keys(settings).length) ? initialUserSettings : settings)
    );
  }

  public saveUserSettings(userSettings: UserSettings): Observable<UserSettings> {
    return this.httpClient.post<UserSettings>('/api/user/settings', userSettings,
      defaultHttpOptionsFromConfig({ignoreLoading: true, ignoreErrors: true}));
  }

  public putUserSettings(userSettingsData: Partial<UserSettings>): Observable<void> {
    return this.httpClient.put<void>('/api/user/settings', userSettingsData,
      defaultHttpOptionsFromConfig({ignoreLoading: true, ignoreErrors: true}));
  }

  public deleteUserSettings(paths: string[]) {
    return this.httpClient.delete(`/api/user/settings/${paths.join(',')}`,
      defaultHttpOptionsFromConfig({ignoreLoading: true, ignoreErrors: true}));
  }

  public getDocumentationLinks(config?: RequestConfig): Observable<DocumentationLinks> {
    return this.httpClient.get<DocumentationLinks>(`/api/user/settings/${UserSettingsType.DOC_LINKS}`,
      defaultHttpOptionsFromConfig(config));
  }

  public updateDocumentationLinks(documentationLinks: DocumentationLinks, config?: RequestConfig): Observable<void> {
    return this.httpClient.put<void>(`/api/user/settings/${UserSettingsType.DOC_LINKS}`, documentationLinks,
      defaultHttpOptionsFromConfig(config));
  }

  public getQuickLinks(config?: RequestConfig): Observable<QuickLinks> {
    return this.httpClient.get<QuickLinks>(`/api/user/settings/${UserSettingsType.QUICK_LINKS}`,
      defaultHttpOptionsFromConfig(config));
  }

  public updateQuickLinks(quickLinks: QuickLinks, config?: RequestConfig): Observable<void> {
    return this.httpClient.put<void>(`/api/user/settings/${UserSettingsType.QUICK_LINKS}`, quickLinks,
      defaultHttpOptionsFromConfig(config));
  }

  public getGettingStarted(config?: RequestConfig): Observable<GettingStarted> {
    return this.httpClient.get<GettingStarted>(`/api/user/settings/${UserSettingsType.GETTING_STARTED}`,
      defaultHttpOptionsFromConfig(config));
  }

  public updateGettingStarted(gettingStarted: GettingStarted, config?: RequestConfig): Observable<void> {
    return this.httpClient.put<void>(`/api/user/settings/${UserSettingsType.GETTING_STARTED}`, gettingStarted,
      defaultHttpOptionsFromConfig(config));
  }

  public getUserDashboardsInfo(config?: RequestConfig): Observable<UserDashboardsInfo> {
    return this.httpClient.get<UserDashboardsInfo>('/api/user/dashboards',
      defaultHttpOptionsFromConfig(config));
  }

  public reportUserDashboardAction(dashboardId: string, action: UserDashboardAction,
                                   config?: RequestConfig): Observable<UserDashboardsInfo> {
    return this.httpClient.get<UserDashboardsInfo>(`/api/user/dashboards/${dashboardId}/${action}`,
      defaultHttpOptionsFromConfig(config));
  }

}
