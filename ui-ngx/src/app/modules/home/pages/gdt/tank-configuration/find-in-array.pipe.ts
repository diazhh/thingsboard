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
