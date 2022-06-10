//! Provides the database command macro.

/// Defines a database command.
#[macro_export]
macro_rules! db {
    // Get the first result and map it to an optional value.
    (
        $name:ident ($($arg:ident: $ty:ty),*) -> Option<$ret:ty> {
            first( $sql:literal ) => $closure:expr
        }
    ) => {
        #[doc = "Performs the following SQL command:"]
        #[doc = ""]
        #[doc = "```sql"]
        #[doc = $sql]
        #[doc = "```"]
        pub fn $name(&mut self, $($arg: $ty),*) -> Result<Option<$ret>, String> {
            use mysql::prelude::Queryable;

            let res = self.inner.exec_first($sql, ($($arg,)*))
                .map_err(|_| "Could not execute SQL when calling ".to_string() + stringify!($name))?;

            let processed = res.map($closure);

            Ok(processed)
        }
    };

    // Get the first result and map it to a value.
    (
        $name:ident ($($arg:ident: $ty:ty),*) -> $ret:ty {
            first( $sql:literal ) => $closure:expr
        }
    ) => {
        #[doc = "Performs the following SQL command:"]
        #[doc = ""]
        #[doc = "```sql"]
        #[doc = $sql]
        #[doc = "```"]
        pub fn $name(&mut self, $($arg: $ty),*) -> Result<$ret, String> {
            use mysql::prelude::Queryable;

            let res = self.inner.exec_first($sql, ($($arg,)*))
                .map_err(|_| "Could not execute SQL when calling ".to_string() + stringify!($name))?;

            let processed = $closure(res);

            Ok(processed)
        }
    };

    // Get the first result and return it as is.
    (
        $name:ident ($($arg:ident: $ty:ty),*) -> $ret:ty {
            first( $sql:literal )
        }
    ) => {
        #[doc = "Performs the following SQL command:"]
        #[doc = ""]
        #[doc = "```sql"]
        #[doc = $sql]
        #[doc = "```"]
        pub fn $name(&mut self, $($arg: $ty),*) -> Result<$ret, String> {
            use mysql::prelude::Queryable;

            let res = self.inner.exec_first($sql, ($($arg,)*))
                .map_err(|_| "Could not execute SQL when calling ".to_string() + stringify!($name))?;

            Ok(res)
        }
    };

    // Get all the results and map them to a value.
    (
        $name:ident ($($arg:ident: $ty:ty),*) -> $ret:ty {
            $sql:literal => $closure:expr
        }
    ) => {
        #[doc = "Performs the following SQL command:"]
        #[doc = ""]
        #[doc = "```sql"]
        #[doc = $sql]
        #[doc = "```"]
        pub fn $name(&mut self, $($arg: $ty),*) -> Result<$ret, String> {
            use mysql::prelude::Queryable;

            let res = self.inner.exec($sql, ($($arg,)*))
                .map_err(|_| "Could not execute SQL when calling ".to_string() + stringify!($name))?;

            let processed = res.into_iter().map($closure).collect();

            Ok(processed)
        }
    };

    // Get all the results and return them as is.
    (
        $name:ident ($($arg:ident: $ty:ty),*) -> $ret:ty {
            $sql:literal
        }
    ) => {
        #[doc = "Performs the following SQL command:"]
        #[doc = ""]
        #[doc = "```sql"]
        #[doc = $sql]
        #[doc = "```"]
        pub fn $name(&mut self, $($arg: $ty),*) -> Result<$ret, String> {
            use mysql::prelude::Queryable;

            let res = self.inner.exec($sql, ($($arg,)*))
                .map_err(|_| "Could not execute SQL when calling ".to_string() + stringify!($name))?;

            Ok(res)
        }
    };

    // Ignore the results.
    (
        $name:ident ($($arg:ident: $ty:ty),*) {
            $sql:literal
        }
    ) => {
        #[doc = "Performs the following SQL command:"]
        #[doc = ""]
        #[doc = "```sql"]
        #[doc = $sql]
        #[doc = "```"]
        pub fn $name(&mut self, $($arg: $ty),*) -> Result<(), String> {
            use mysql::prelude::Queryable;

            self.inner.exec_drop($sql, ($($arg,)*))
                .map_err(|_| "Could not execute SQL when calling ".to_string() + stringify!($name))?;

            Ok(())
        }
    };
}
