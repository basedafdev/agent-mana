class AgentMana < Formula
  desc "AI usage monitoring desktop app - track Anthropic and OpenAI API usage"
  homepage "https://github.com/basedafdev/agent-mana"
  version "0.1.0"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/basedafdev/agent-mana/releases/download/v#{version}/agent-mana-aarch64-apple-darwin"
      sha256 "REPLACE_WITH_SHA256"
    else
      url "https://github.com/basedafdev/agent-mana/releases/download/v#{version}/agent-mana-x86_64-apple-darwin"
      sha256 "REPLACE_WITH_SHA256"
    end
  end

  def install
    bin.install "agent-mana"
  end

  test do
    system "#{bin}/agent-mana", "--version"
  end
end
