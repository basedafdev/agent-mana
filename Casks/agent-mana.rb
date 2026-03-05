cask "agent-mana" do
  arch arm: "aarch64", intel: "x64"

  version :latest
  sha256 :no_check

  url "https://github.com/tommyldev/agent-mana/releases/latest/download/Agent.Mana_#{arch}.app.tar.gz"
  name "Agent Mana"
  desc "AI usage monitoring desktop app"
  homepage "https://github.com/tommyldev/agent-mana"

  app "Agent Mana.app"
end
