import { Injectable } from '@angular/core';

@Injectable()
export class JsonRefResolver {
	transform(objects: Object | Object[]) {
		let idObjects = [];
		findIdObjects(objects);
		resolve(objects);
		cleanup();

		return objects;

		function findIdObjects(data: any) {
			// Is data an array? The top-level data is an array. Go through the array and parse every object in the array.
			if (Array.isArray(data)) {
				data.forEach((item: any) => findIdObjects(item));
				return;
			}

			if (data && typeof data === 'object') {
				if ('$id' in data) {
					idObjects.push(data);
				}

				// Look for nested objects to go through recursively
				for (var key in data) {
					// For an array or object, recursively call this function again, until the point that we can parse primitive values
					// We're only checking for isObject() here, since isObject() gives true for an array as well.
					if (typeof data[key] === 'object') {
						findIdObjects(data[key]);
					}
				}
			}
		}

		function resolve(data: any) {
			if (Array.isArray(data)) {
				for (let i = 0; i < data.length; i++) {
					// If there's a $ref, then resolve it
					if (data[i] && data[i].$ref !== undefined) {
						data[i] = idObjects.find(idObject => idObject.$id === data[i].$ref);
					}
					else {
						resolve(data[i]);
					}
				}
				return;
			}

			if (data && typeof data === 'object') {
				// Go through every property looking for nested objects/arrays
				for (var prop in data) {
					if (data[prop] && data[prop].$ref !== undefined) {
						data[prop] = idObjects.find(idObject => idObject.$id === data[prop].$ref);
					}
					else if (typeof data[prop] === 'object') {
						resolve(data[prop]);
					}
				}
				return;
			}
		}

		function cleanup() {
			idObjects.forEach(idObject => {
				delete idObject.$id;
			});
		}
	}
}
