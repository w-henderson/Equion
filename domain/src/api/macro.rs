#[macro_export]
macro_rules! get_endpoint {
    ($endpoint:expr) => {
        __ENDPOINTS
            .iter()
            .find(|(endpoint, _)| *endpoint == $endpoint)
            .map(|(_, handler)| *handler)
    };
}

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

macro_rules! declare_endpoint {
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

macro_rules! endpoint_param {
    ($json:expr, (numeric optional $key:expr)) => {
        $crate::api::get_int($json, $key).ok().map(|v| v as usize)
    };

    ($json:expr, (optional $key:expr)) => {
        $crate::api::get_string($json, $key).ok()
    };

    ($json:expr, (numeric $key:expr)) => {
        $crate::api::get_int($json, $key)? as usize
    };

    ($json:expr, $key:expr) => {
        $crate::api::get_string($json, $key)?
    };
}
