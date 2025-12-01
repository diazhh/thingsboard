///
/// Copyright © 2016-2025 The Thingsboard Authors
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

import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to find an item in an array by a key and return a specific property
 * Usage: {{ array | find:'key':value:'returnProp' }}
 * Example: {{ tankShapeOptions | find:'value':tankForm.tankShape:'label' }}
 */
@Pipe({
  name: 'find',
  pure: true
})
export class FindInArrayPipe implements PipeTransform {

  transform(array: any[], key: string, value: any, returnProp?: string): any {
    if (!array || !Array.isArray(array)) {
      return returnProp ? '' : null;
    }

    const found = array.find(item => item[key] === value);

    if (!found) {
      return returnProp ? '' : null;
    }

    return returnProp ? found[returnProp] : found;
  }
}
