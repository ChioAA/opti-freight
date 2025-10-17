# Dockerfile for Anchor/Solana Development
# Based on Ubuntu 24.04 with GLIBC 2.39+

FROM ubuntu:24.04

# Avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    pkg-config \
    libudev-dev \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:$PATH"

# Install Solana CLI
RUN sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
ENV PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Configure Solana for Devnet
RUN solana config set --url https://api.devnet.solana.com

# Install Anchor using AVM
RUN cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
RUN avm install latest
RUN avm use latest

# Verify installations
RUN rustc --version && \
    cargo --version && \
    solana --version && \
    anchor --version

# Set working directory
WORKDIR /workspace

# Copy the wallet from host (will be done via volume mount)
# Expose any ports if needed (optional)
# EXPOSE 8899

CMD ["/bin/bash"]
