# This module has been deprecated and split into two separate modules:
# - infra/modules/lambdas-core/ (foundational Lambdas with no Agent dependencies)
# - infra/modules/lambdas-api/ (API Lambdas that invoke Bedrock Agents)
#
# This split resolves the circular dependency where agents need Lambda ARNs
# and feedback_handler Lambda needs Agent IDs.
#
# Do not add new resources to this file. Use lambdas-core or lambdas-api instead.
