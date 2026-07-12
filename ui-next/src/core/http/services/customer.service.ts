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

import { createDefaultHttpOptions, defaultHttpOptionsFromConfig, RequestConfig } from '../http-utils';
import { HttpClient } from '../http-client';
import { Observable } from 'rxjs';
import { PageLink } from '@shared/models/page/page-link';
import { PageData } from '@shared/models/page/page-data';
import { Customer } from '@shared/models/customer.model';
import { SaveEntityParams } from '@shared/models/entity.models';

export class CustomerService {

  constructor(public readonly httpClient: HttpClient
  ) { }

  public getCustomers(pageLink: PageLink, config?: RequestConfig): Observable<PageData<Customer>> {
    return this.httpClient.get<PageData<Customer>>(`/api/customers${pageLink.toQuery()}`,
      defaultHttpOptionsFromConfig(config));
  }

  public getCustomer(customerId: string, config?: RequestConfig): Observable<Customer> {
    return this.httpClient.get<Customer>(`/api/customer/${customerId}`, defaultHttpOptionsFromConfig(config));
  }

  public getCustomersByIds(customerIds: Array<string>, config?: RequestConfig): Observable<Array<Customer>> {
    return this.httpClient.get<Array<Customer>>(`/api/customers?customerIds=${customerIds.join(',')}`, defaultHttpOptionsFromConfig(config));
  }

  public saveCustomer(customer: Customer, config?: RequestConfig): Observable<Customer>;
  public saveCustomer(customer: Customer, saveParams: SaveEntityParams, config?: RequestConfig): Observable<Customer>;
  public saveCustomer(customer: Customer, saveParamsOrConfig?: SaveEntityParams | RequestConfig, config?: RequestConfig): Observable<Customer> {
    return this.httpClient.post<Customer>('/api/customer', customer, createDefaultHttpOptions(saveParamsOrConfig, config));
  }

  public deleteCustomer(customerId: string, config?: RequestConfig) {
    return this.httpClient.delete(`/api/customer/${customerId}`, defaultHttpOptionsFromConfig(config));
  }

}
