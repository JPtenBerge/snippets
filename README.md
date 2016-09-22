# Snippets
This is a small collection of snippets I created and found useful enough to share with the internet. Hopefully you will too.

## About me
I'm JP, software engineer and trainer. I love to work with ASP.NET MVC/Web API, ASP.NET Core, Node.js and web technologies in general: HTML5, CSS3, JavaScript, jQuery, AngularJS and Angular 2.


## Snippets

### json-ref-resolver.js

An AngularJS interceptor for resolving `$ref`s and `$id`s. Example:

```
[
	{ "$id": 14, "foo": "bar" },
	{ "$ref": 14 }
]
```
will be parsed into:
```
[
	{ "foo": "bar" },
	{ "foo": "bar" }
]
```

#### Usage
Simply register the interceptor:

```
angular.module('yourapp', [
	'myapp.services' // or rename the module in the interceptor file
])
.config(['$httpProvider', function ($httpProvider) {
	$httpProvider.interceptors.push('jsonRefResolver');
}])
```
And every JSON response with `$id`s and `$ref`s will be parsed.
```
$http.get('api/movies').then(response => { ... });
```

#### Background 
I had a REST API that returned data with circular references, which I actually needed in my application. Using ASP.NET MVC and the Web API, I configured it to preserve references during serialization:
```
public static class WebApiConfig
{
	public static void Register(HttpConfiguration config)
	{
		// [...]
		
		var jsonFormatter = config.Formatters.JsonFormatter;
		jsonFormatter.SerializerSettings.PreserveReferencesHandling = PreserveReferencesHandling.Objects;
		
		// [...]
	}
}
```
But these references aren't standard JSON and they won't be parsed automagically. I found some solutions on the internet, but some parsers assumed `$ref` contained a path to the object rather than a number ([cycle.js from Douglas Crockford](https://github.com/douglascrockford/JSON-js/blob/master/cycle.js)). Others weren't catered to AngularJS in that using `filter` or `angular.copy()` in the resolved object tree resulted in circular reference errors.

### json-ref-resolver.ts

The Angular 2 version of the JSON ref resolver described above. Interceptors don't exist anymore in Angular 2, so it's a simple injectable service. Because Angular 2 does not have a digest cycle, an `angular.copy()` nor a `filter` filter, this resolver does a flat replace of all references and circular references can exist without issues. Plus it's TypeScript, so we use can use more modern language features.

```
@Injectable()
export class CandyApiService {
	constructor(
		private http: Http,
		private jsonRefResolver: JsonRefResolver) {
	}

	query() {
		return this.http
			.get('api/candylotsofcandy'))
			.map(response => this.jsonRefResolver.transform(response));
	}
}
```
