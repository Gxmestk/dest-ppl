use minigrep::{search, search_case_insensitive};
use std::env;
use std::error::Error;
use std::fs;
use std::process;

fn main() {
    let config: Config = Config::build(env::args()).unwrap_or_else(|err| {
        eprintln!("Problem parsing arguments: {}", err);
        process::exit(1);
    });

    if let Err(e) = run(config) {
        eprintln!("Application Error: {}", e);
        process::exit(1);
    }
}

fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(config.file_path)?;
    // let result: impl Iterator<Item = &str> = if config.ignore_case { // this give opaque type
    //     search_case_insensitive(&config.query, &contents)
    // } else {
    //     search(&config.query, &contents)
    // };
    //
    //     if config.ignore_case {
    //     for line in minigrep::search_case_insensitive(&config.query, &contents) {  // this fine but duplicate the loop
    //         println!("{line}");
    //     }
    // } else {
    //     for line in minigrep::search(&config.query, &contents) {
    //         println!("{line}");
    //     }
    // }

    // Use trait objects to unify the return types
    let result: Box<dyn Iterator<Item = &str>> = if config.ignore_case {
        Box::new(search_case_insensitive(&config.query, &contents))
    } else {
        Box::new(search(&config.query, &contents))
    };
    for line in result {
        println!("{}", line);
    }

    Ok(())
}

struct Config {
    query: String,
    file_path: String,
    ignore_case: bool,
}

impl Config {
    fn build(mut args: impl Iterator<Item = String>) -> Result<Config, &'static str> {
        args.next();

        let query = match args.next() {
            Some(arg) => arg,
            None => return Err("No query"),
        };

        let file_path = match args.next() {
            Some(arg) => arg,
            None => return Err("No file path"),
        };

        let ignore_case = env::var("IGNORE_CASE").is_ok();

        Ok(Config {
            query,
            file_path,
            ignore_case,
        })
    }
}
