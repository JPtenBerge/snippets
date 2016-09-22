angular.module('myapp.services').factory('jsonRefResolver', ['$q', function ($q) {
	// The backend sends back data with references to refer to an object and thus preventing circular loops.
	// This response interceptor resolves those references.
	// My backend was a REST API created with ASP.NET MVC 5 with Web API 2. This was the configuration for 
	// dealing with circular references.
	
	// var jsonFormatter = config.Formatters.JsonFormatter;
	// jsonFormatter.SerializerSettings.PreserveReferencesHandling = PreserveReferencesHandling.Objects;



	// Note: Douglas Crockford has a similar script at https://github.com/douglascrockford/JSON-js/blob/master/cycle.js, 
	// but this assumes that the references contain JSON paths as references instead of IDs.
	// This person ran into a similar situation: http://stackoverflow.com/questions/15118667/how-to-parse-json-string-contains-circular-reference-in-javascript

	// One more note: we can't actually fully restore the referenced objects. angular.copy() and the 
	// filter filter don't handle circular references properly. If object A contains an object B, where 
	// object B refers back to object A, angular.copy() doesn't know how to handle this and the filter filter 
	// just goes on and on searching. Thus, it can't be parsed. Unless, of course, an object C enters the 
	// picture and has a reference to object B. In that scenario, B should contain a reference to A.

	return {
		response: jsonRefParse
	};

	function jsonRefParse(response) {
		var idObjects = [];

			if (response.headers()['content-type'] === 'application/json; charset=utf-8') {
				// When accounting for circular referencing, a list of $ids is kept when traversing 
				// the hierarchy of objects. Objects lower in the hierarchy should not have a live object 
				// of some thing higher up in the hierarchy. Thus, it's an ignore list.
				// But, it turns out that a third object sometimes comes into play. When object B is 
				// in the same hierarchy as A, object B should not contain A's. But object C, outside 
				// the hierarchy of object A, sometimes references B. In that scenario, A should 
				// appear in that hierarchy. Thus, traversing the tree again looking for ignored 
				// references the first time makes sure we replace more.
				// Note that we don't traverse the tree fully, only resolved objects are reevaluated with 
				// the ignore list for that part in the tree.

				// Find objects with an identifier ($id)
				findIdObjects(response.data);

				// Go through all data, find references and resolve them recursively
				resolve(response.data);

				// Cleanup
				removeAllReferences(response.data);
			}

			return response;


		// This is the most important function in this file: it resolves all references in the data
		function resolve(data) {
			// Find object with references to other objects
			var refObjects = findRefs(data);

			// Resolve all objects that hold references to unique objects
			for (var i = refObjects.length - 1; i >= 0; i--) {
				resolveRefObject(refObjects[i]);
			}

			// After resolving all the current refobjects, call this function again for each of those objects
			for (var i = refObjects.length - 1; i >= 0; i--) {
				resolve(refObjects[i]);
			}
		}

		function findIdObjects(data) {
			// Is data an array? The top-level data is an array. Go through the array and parse every object in the array.
			if (angular.isArray(data)) {
				for (var i = 0; i < data.length; i++) {
					findIdObjects(data[i]);
				}
				return;
			}

			// Is data an object?
			if (angular.isObject(data)) {
				if ('$id' in data) {
					idObjects.push(data);
				}

				// Look for nested objects to go through recursively
				for (var key in data) {
					// For an array or object, recursively call this function again, until the point that we can parse primitive values
					// We're only checking for isObject() here, since isObject() gives true for an array as well.
					if (angular.isObject(data[key])) {
						findIdObjects(data[key]);
					}
				}
			}
		}

		function findRefs(data) {
			data.$refIdsToIgnore = data.$refIdsToIgnore || [];
			var refObjects = [];

			// Is data an array? The top-level data is an array. Go through the array and parse every object in the array.
			if (angular.isArray(data)) {
				for (var i = 0; i < data.length; i++) {
					data[i].$refIdsToIgnore = angular.copy(data.$refIdsToIgnore);
					refObjects = refObjects.concat(findRefs(data[i]));
				}
				return refObjects;
			}

			// Is data an object?
			if (angular.isObject(data)) {
				if ('$ref' in data && data.$refIdsToIgnore.indexOf(data.$ref) === -1) {
					refObjects.push(data);
				}
				if ('$id' in data) {
					data.$refIdsToIgnore.push(data.$id);
				}

				// Look for nested objects to go through recursively
				for (var key in data) {
					// For an array or object, recursively call this function again, until the point that we can parse primitive values
					// We're only checking for isObject() here, since isObject() gives true for an array as well.
					if (key !== '$refIdsToIgnore' && angular.isObject(data[key])) {
						data[key].$refIdsToIgnore = angular.copy(data.$refIdsToIgnore);
						refObjects = refObjects.concat(findRefs(data[key]));
					}
				}
			}

			return refObjects;
		}

		function resolveRefObject(refObject) {
			for (var j = 0; j < idObjects.length; j++) {
				var idObject = idObjects[j];
				if (refObject.$ref === idObject.$id) {
					// Directly assigning refObject[i] will not cause the root object to change, it just adds a completely new item to the array
					// By copying all properties from the unique object to the referencing object, thus not losing the connection to the root.
					for (var key in idObject) {
						if (key !== '$refIdsToIgnore') {
							if (angular.isObject(idObject[key])) {
								refObject[key] = angular.copy(idObject[key]);
							}
							else {
								refObject[key] = idObject[key];
							}
						}
					}

					// Append the ignore list with the $id of the object we just resolved to prevent circular references
					refObject.$refIdsToIgnore.push(idObject.$id);

					// Cleanup: the object has been resolved, $ref needs to be removed to avoid more parsing
					delete refObject.$ref;
					break;
				}
			}
		}

		// Cleanup functions (just one at the moment, actually)
		function removeAllReferences(data) {
			delete data.$id;
			delete data.$ref;
			delete data.$refIdsToIgnore;

			// Is data an array? The top-level data is an array. Go through the array and parse every object in the array.
			if (angular.isArray(data)) {
				for (var i = 0; i < data.length; i++) {
					removeAllReferences(data[i]);
				}
				return;
			}

			// Is data an object?
			if (angular.isObject(data)) {
				delete data.$id;
				delete data.$ref;
				delete data.$refIdsToIgnore;

				// Inspect individual properties and look for $ref
				for (var key in data) {
					// For an array or object, recursively call this function again, until the point that we can parse primitive values
					// We're only checking for isObject() here, since isObject() gives true for an array as well.
					if (angular.isObject(data[key])) {
						removeAllReferences(data[key]);
					}
				}
			}
		}
	};
}]);