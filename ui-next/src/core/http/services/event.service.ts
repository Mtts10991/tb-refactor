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
import { TimePageLink } from '@shared/models/page/page-link';
import { PageData } from '@shared/models/page/page-data';
import { EntityId } from '@shared/models/id/entity-id';
import { DebugEventType, Event, EventType, FilterEventBody } from '@shared/models/event.models';

export class EventService {

  constructor(public readonly httpClient: HttpClient
  ) { }

  public getEvents(entityId: EntityId, eventType: EventType | DebugEventType, tenantId: string, pageLink: TimePageLink,
                   config?: RequestConfig): Observable<PageData<Event>> {
    return this.httpClient.get<PageData<Event>>(`/api/events/${entityId.entityType}/${entityId.id}/${eventType}` +
              `${pageLink.toQuery()}&tenantId=${tenantId}`,
      defaultHttpOptionsFromConfig(config));
  }

  public getFilterEvents(entityId: EntityId, eventType: EventType | DebugEventType, tenantId: string,
                         filters: FilterEventBody, pageLink: TimePageLink, config?: RequestConfig): Observable<PageData<Event>> {
    return this.httpClient.post<PageData<Event>>(`/api/events/${entityId.entityType}/${entityId.id}` +
      `${pageLink.toQuery()}&tenantId=${tenantId}`, {...filters, eventType}, defaultHttpOptionsFromConfig(config));
  }

  public clearEvents(entityId: EntityId, eventType: EventType | DebugEventType, filters: FilterEventBody, tenantId: string,
                     pageLink: TimePageLink, config?: RequestConfig) {
    return this.httpClient.post(`/api/events/${entityId.entityType}/${entityId.id}/clear?tenantId=${tenantId}` +
      (pageLink.startTime ? `&startTime=${pageLink.startTime}` : ``) +
      (pageLink.endTime ? `&endTime=${pageLink.endTime}` : ``), {...filters, eventType},
      defaultHttpOptionsFromConfig(config));
  }
}
