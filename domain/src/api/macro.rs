//! Provides the endpoint declaration macros.

/// Gets the handler for the given endpoint if it exists.
#[macro_export]
macro_rules! get_endpoint {
    ($endpoint:expr) => {
        __ENDPOINTS
            .iter()
            .find(|(endpoint, _)| *endpoint == $endpoint)
            .map(|(_, handler)| *handler)
    };
}

/// Declares the API endpoints and their handlers. After declaration, endpoints can be accessed with the `get_endpoint` macro.
///
/// See the documentation for [`declare_endpoint`] for syntax.
#[macro_export]
macro_rules! declare_endpoints {
    ($( $endpoint:expr => $function:ident $args:tt -> $output:tt ),*) => {
        mod __endpoints {
            $(
                declare_endpoint!($endpoint, $function $args, $output);
            )*
        }

        static __ENDPOINTS: &[(&str, fn(std::sync::Arc<$crate::State>, humphrey_json::Value) -> humphrey_json::Value)] = &[
            $(
                ($endpoint, __endpoints::$function)
            ),*
        ];
    };
}

/// Declares an individual endpoint.
///
/// ## Syntax
/// Declaring an endpoint which doesn't return anything:
/// ```
/// declare_endpoint!("v1/foo", foo("param1", "param2"), None);
/// ```
///
/// Declaring an endpoint which returns specific key-value pairs from the return value:
/// ```
/// declare_endpoint!("v1/bar", bar("param1"), {
///     "key1": field_1,
///     "key2": field_2
/// });
/// ```
///
/// Declaring an endpoint which returns a single value:
/// ```
/// declare_endpoint("v1/baz", baz("param1"), "responseFieldName");
/// ```
///
/// Optional and numeric parameters:
/// ```
/// declare_endpoint!("v1/foo", foo("param1", (optional "param2"), (numeric "param3"), (numeric optional "param4")), None);
/// ```
macro_rules! declare_endpoint {
    // Endpoints which do not return anything.
    ($endpoint:expr, $function:ident ( $( $param:tt ),* ), None) => {
        pub fn $function(state: std::sync::Arc<$crate::State>, json: humphrey_json::Value) -> humphrey_json::Value {
            $crate::api::error_context(|| {
                state.$function($( endpoint_param!(&json, $param) ),*)?;

                Ok(humphrey_json::Value::Object(vec![
                    ("success".to_string(), humphrey_json::Value::Bool(true))
                ]))
            })
        }
    };

    // Endpoints which return specific key-value pairs from the returned object.
    ($endpoint:expr, $function:ident ( $( $param:tt ),* ), { $( $output_key:tt : $value:tt ),* }) => {
        pub fn $function(state: std::sync::Arc<$crate::State>, json: humphrey_json::Value) -> humphrey_json::Value {
            $crate::api::error_context(|| {
                let response = state.$function($( endpoint_param!(&json, $param) ),*)?;

                Ok(humphrey_json::Value::Object(vec![
                    ("success".to_string(), humphrey_json::Value::Bool(true)),
                    $(
                        ($output_key.to_string(), humphrey_json::Value::from(response.$value)),
                    )*
                ]))
            })
        }
    };

    // Endpoints which return the entire returned object.
    ($endpoint:expr, $function:ident ( $( $param:tt ),* ), $output:expr) => {
        pub fn $function(state: std::sync::Arc<$crate::State>, json: humphrey_json::Value) -> humphrey_json::Value {
            $crate::api::error_context(|| {
                let response = state.$function($( endpoint_param!(&json, $param) ),*)?;

                Ok(humphrey_json::Value::Object(vec![
                    ("success".to_string(), humphrey_json::Value::Bool(true)),
                    ($output.to_string(), humphrey_json::Value::from(response)),
                ]))
            })
        }
    };
}

/// Parses an endpoint parameter.
macro_rules! endpoint_param {
    // Optional numeric parameter.
    ($json:expr, (numeric optional $key:expr)) => {
        $crate::api::get_int($json, $key).ok().map(|v| v as usize)
    };

    // Optional string parameter.
    ($json:expr, (optional $key:expr)) => {
        $crate::api::get_string($json, $key).ok()
    };

    // Required numeric parameter.
    ($json:expr, (numeric $key:expr)) => {
        $crate::api::get_int($json, $key)? as usize
    };

    // Required string parameter.
    ($json:expr, $key:expr) => {
        $crate::api::get_string($json, $key)?
    };
}
