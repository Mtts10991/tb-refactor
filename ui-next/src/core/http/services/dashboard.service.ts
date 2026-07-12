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

/* TODO Phase 1.5/1.6: port @angular/core (Inject) */
import { HttpClient } from '../http-client';
import { defaultHttpOptions, defaultHttpOptionsFromConfig, RequestConfig } from '../http-utils';
import { Observable } from 'rxjs';
import { PageLink } from '@shared/models/page/page-link';
import { PageData } from '@shared/models/page/page-data';
import { Dashboard, DashboardInfo, HomeDashboard, HomeDashboardInfo } from '@shared/models/dashboard.models';
/* WINDOW import removed — use global window in Phase 2 */
/* TODO Phase 1.5: Router logic will be ported to Next.js navigation */
type Router = { url: string; events: { subscribe: (cb: (e: unknown) => void) => void } };
import { filter, map, publishReplay, refCount } from 'rxjs/operators';

// @dynamic
export class DashboardService {

  stDiffObservable: Observable<number>;
  currentUrl: string;

  constructor(public readonly httpClient: HttpClient,
    private router: Router,
    private window: Window
  ) {
    this.currentUrl = this.router.url.split('?')[0];
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(
      () => {
        const newUrl = this.router.url.split('?')[0];
        if (this.currentUrl !== newUrl) {
          this.stDiffObservable = null;
          this.currentUrl = newUrl;
        }
      }
    );
  }

  public getTenantDashboards(pageLink: PageLink, config?: RequestConfig): Observable<PageData<DashboardInfo>> {
    return this.httpClient.get<PageData<DashboardInfo>>(`/api/tenant/dashboards${pageLink.toQuery()}`,
      defaultHttpOptionsFromConfig(config));
  }

  public getTenantDashboardsByTenantId(tenantId: string, pageLink: PageLink,
                                       config?: RequestConfig): Observable<PageData<DashboardInfo>> {
    return this.httpClient.get<PageData<DashboardInfo>>(`/api/tenant/${tenantId}/dashboards${pageLink.toQuery()}`,
      defaultHttpOptionsFromConfig(config));
  }

  public getCustomerDashboards(customerId: string, pageLink: PageLink, config?: RequestConfig): Observable<PageData<DashboardInfo>> {
    return this.httpClient.get<PageData<DashboardInfo>>(`/api/customer/${customerId}/dashboards${pageLink.toQuery()}`,
      defaultHttpOptionsFromConfig(config));
  }

  public getDashboard(dashboardId: string, config?: RequestConfig): Observable<Dashboard> {
    return this.httpClient.get<Dashboard>(`/api/dashboard/${dashboardId}`, defaultHttpOptionsFromConfig(config));
  }

  public exportDashboard(dashboardId: string, includeResources = true, config?: RequestConfig): Observable<Dashboard> {
    let url = `/api/dashboard/${dashboardId}`;
    if (includeResources) {
      url += '?includeResources=true';
    }
    return this.httpClient.get<Dashboard>(url, defaultHttpOptionsFromConfig(config));
  }

  public getDashboardInfo(dashboardId: string, config?: RequestConfig): Observable<DashboardInfo> {
    return this.httpClient.get<DashboardInfo>(`/api/dashboard/info/${dashboardId}`, defaultHttpOptionsFromConfig(config));
  }

  public getDashboards(dashboardIds: string[], config?: RequestConfig): Observable<Array<DashboardInfo>> {
    return this.httpClient.get<Array<DashboardInfo>>(`/api/dashboards?dashboardIds=${dashboardIds.join(',')}`,
      defaultHttpOptionsFromConfig(config));
  }

  public saveDashboard(dashboard: Dashboard, config?: RequestConfig): Observable<Dashboard> {
    return this.httpClient.post<Dashboard>('/api/dashboard', dashboard, defaultHttpOptionsFromConfig(config));
  }

  public deleteDashboard(dashboardId: string, config?: RequestConfig) {
    return this.httpClient.delete(`/api/dashboard/${dashboardId}`, defaultHttpOptionsFromConfig(config));
  }

  public assignDashboardToCustomer(customerId: string, dashboardId: string,
                                   config?: RequestConfig): Observable<Dashboard> {
    return this.httpClient.post<Dashboard>(`/api/customer/${customerId}/dashboard/${dashboardId}`,
      null, defaultHttpOptionsFromConfig(config));
  }

  public unassignDashboardFromCustomer(customerId: string, dashboardId: string,
                                       config?: RequestConfig) {
    return this.httpClient.delete(`/api/customer/${customerId}/dashboard/${dashboardId}`, defaultHttpOptionsFromConfig(config));
  }

  public makeDashboardPublic(dashboardId: string, config?: RequestConfig): Observable<Dashboard> {
    return this.httpClient.post<Dashboard>(`/api/customer/public/dashboard/${dashboardId}`, null,
      defaultHttpOptionsFromConfig(config));
  }

  public makeDashboardPrivate(dashboardId: string, config?: RequestConfig): Observable<Dashboard> {
    return this.httpClient.delete<Dashboard>(`/api/customer/public/dashboard/${dashboardId}`,
      defaultHttpOptionsFromConfig(config));
  }

  public updateDashboardCustomers(dashboardId: string, customerIds: Array<string>,
                                  config?: RequestConfig): Observable<Dashboard> {
    return this.httpClient.post<Dashboard>(`/api/dashboard/${dashboardId}/customers`, customerIds,
      defaultHttpOptionsFromConfig(config));
  }

  public addDashboardCustomers(dashboardId: string, customerIds: Array<string>,
                               config?: RequestConfig): Observable<Dashboard> {
    return this.httpClient.post<Dashboard>(`/api/dashboard/${dashboardId}/customers/add`, customerIds,
      defaultHttpOptionsFromConfig(config));
  }

  public removeDashboardCustomers(dashboardId: string, customerIds: Array<string>,
                                  config?: RequestConfig): Observable<Dashboard> {
    return this.httpClient.post<Dashboard>(`/api/dashboard/${dashboardId}/customers/remove`, customerIds,
      defaultHttpOptionsFromConfig(config));
  }

  public getHomeDashboard(config?: RequestConfig): Observable<HomeDashboard> {
    return this.httpClient.get<HomeDashboard>('/api/dashboard/home', defaultHttpOptionsFromConfig(config));
  }

  public getTenantHomeDashboardInfo(config?: RequestConfig): Observable<HomeDashboardInfo> {
    return this.httpClient.get<HomeDashboardInfo>('/api/tenant/dashboard/home/info', defaultHttpOptionsFromConfig(config));
  }

  public setTenantHomeDashboardInfo(homeDashboardInfo: HomeDashboardInfo, config?: RequestConfig): Observable<any> {
    return this.httpClient.post<any>('/api/tenant/dashboard/home/info', homeDashboardInfo,
      defaultHttpOptionsFromConfig(config));
  }

  public getPublicDashboardLink(dashboard: DashboardInfo): string | null {
    if (dashboard && dashboard.assignedCustomers && dashboard.assignedCustomers.length > 0) {
      const publicCustomers = dashboard.assignedCustomers
        .filter(customerInfo => customerInfo.public);
      if (publicCustomers.length > 0) {
        const publicCustomerId = publicCustomers[0].customerId.id;
        let url = this.window.location.protocol + '//' + this.window.location.hostname;
        const port = this.window.location.port;
        if (port && port.length > 0 && port !== '80' && port !== '443') {
          url += ':' + port;
        }
        url += `/dashboard/${dashboard.id.id}?publicId=${publicCustomerId}`;
        return url;
      }
    }
    return null;
  }

  public getServerTimeDiff(): Observable<number> {
    if (!this.stDiffObservable) {
      const url = '/api/dashboard/serverTime';
      const ct1 = Date.now();
      this.stDiffObservable = this.httpClient.get<number>(url, defaultHttpOptions(true)).pipe(
        map((st) => {
          const ct2 = Date.now();
          const stDiff = Math.ceil(st - (ct1 + ct2) / 2);
          return stDiff;
        }),
        publishReplay(1),
        refCount()
      );
    }
    return this.stDiffObservable;
  }

  public getEdgeDashboards(edgeId: string, pageLink: PageLink, type: string = '',
                           config?: RequestConfig): Observable<PageData<DashboardInfo>> {
    return this.httpClient.get<PageData<DashboardInfo>>(`/api/edge/${edgeId}/dashboards${pageLink.toQuery()}&type=${type}`,
      defaultHttpOptionsFromConfig(config))
  }

  public assignDashboardToEdge(edgeId: string, dashboardId: string,
                               config?: RequestConfig): Observable<Dashboard> {
    return this.httpClient.post<Dashboard>(`/api/edge/${edgeId}/dashboard/${dashboardId}`, null,
      defaultHttpOptionsFromConfig(config));
  }

  public unassignDashboardFromEdge(edgeId: string, dashboardId: string,
                                   config?: RequestConfig) {
    return this.httpClient.delete(`/api/edge/${edgeId}/dashboard/${dashboardId}`,
      defaultHttpOptionsFromConfig(config));
  }

}
