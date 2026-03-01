output "prompt_engineer_agent_id" {
  description = "ID of the PromptEngineer Bedrock Agent"
  value       = aws_bedrockagent_agent.prompt_engineer_agent.id
}

output "prompt_engineer_alias_id" {
  description = "Alias ID for invoking the PromptEngineer agent — required alongside agent_id for SDK calls"
  value       = aws_bedrockagent_agent_alias.prompt_engineer_alias.agent_alias_id
}

output "quality_gatekeeper_agent_id" {
  description = "ID of the QualityGatekeeper Bedrock Agent"
  value       = aws_bedrockagent_agent.quality_gatekeeper_agent.id
}

output "quality_gatekeeper_alias_id" {
  description = "Alias ID for invoking the QualityGatekeeper agent — required alongside agent_id for SDK calls"
  value       = aws_bedrockagent_agent_alias.quality_gatekeeper_alias.agent_alias_id
}