/**
 * Copyright © 2016-2025 The Thingsboard Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.thingsboard.server.dao.gdt.audit.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.thingsboard.server.common.data.alarm.Alarm;

/**
 * Publisher for alarm events
 * Integrates with AlarmService to publish events when alarms change
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AlarmEventPublisher {
    
    private final ApplicationEventPublisher eventPublisher;
    
    /**
     * Publishes alarm created event
     */
    public void publishAlarmCreated(Alarm alarm) {
        eventPublisher.publishEvent(new AlarmCreatedEvent(alarm));
        log.debug("[{}] Published alarm created event: {}", 
            alarm.getTenantId(), alarm.getType());
    }
    
    /**
     * Publishes alarm acknowledged event
     */
    public void publishAlarmAcknowledged(Alarm alarm) {
        eventPublisher.publishEvent(new AlarmAcknowledgedEvent(alarm));
        log.debug("[{}] Published alarm acknowledged event: {}", 
            alarm.getTenantId(), alarm.getType());
    }
    
    /**
     * Publishes alarm cleared event
     */
    public void publishAlarmCleared(Alarm alarm) {
        eventPublisher.publishEvent(new AlarmClearedEvent(alarm));
        log.debug("[{}] Published alarm cleared event: {}", 
            alarm.getTenantId(), alarm.getType());
    }
}
