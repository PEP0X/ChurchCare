mod domain;
mod infrastructure;
mod services;
mod api;

use std::sync::Arc;
use infrastructure::supabase_repo::SupabaseLicenseRepository;
use services::licensing_service::LicensingService;
use api::handlers::AppState;
use api::routes::create_router;

const SUPABASE_URL: &str = "https://pluijiucmbqjwnaoyyhi.supabase.co";
const SUPABASE_SECRET_KEY: &str = "sb_secret_kEcp8RnS_Y0ns19mkusbng_p0ZPJTrB";

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    println!("============================================================");
    println!("🛡️  ChurchCare Licensing Microservice (Rust Core)");
    println!("============================================================");

    let base_url = std::env::var("SUPABASE_URL").unwrap_or_else(|_| SUPABASE_URL.to_string());
    let secret_key = std::env::var("SUPABASE_SECRET_KEY").unwrap_or_else(|_| SUPABASE_SECRET_KEY.to_string());

    let repo = Arc::new(SupabaseLicenseRepository::new(base_url, secret_key));
    let service = LicensingService::new(repo);

    let state = Arc::new(AppState { service });
    let app = create_router(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "4040".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    println!("🚀 Licensing Server running at: http://localhost:{}", port);
    println!("📡 Health check:                http://localhost:{}/health", port);
    println!("📋 Licenses API:               http://localhost:{}/api/licenses", port);
    println!("⚡ Activation API:             http://localhost:{}/api/activate", port);
    println!("============================================================");

    axum::serve(listener, app).await?;

    Ok(())
}
