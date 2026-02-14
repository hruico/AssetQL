# AssetQL - Requirements Document

## 1. Project Overview

### Problem Statement

Current AI image generation tools operate in isolation, producing individual assets without addressing the production-scale needs of creative teams. Organizations requiring 100-500 style-consistent assets face a manual, repetitive workflow that involves:

- Generating images one-by-one or in small batches
- Manually ensuring style consistency across assets
- Repetitive prompt engineering for similar content
- Manual organization, tagging, and categorization of generated assets
- Time-consuming reformatting for different platforms
- Lack of version control and asset lifecycle management

This results in bottlenecks that prevent teams from leveraging AI at production scale, with creative teams spending 60-80% of their time on workflow management rather than creative direction.

### Target Users

**Primary Users:**
- Game developers requiring character variations, item assets, and environmental textures
- Marketing agencies producing campaign assets across multiple channels
- Social media brand managers creating daily content variations
- E-commerce/D2C creative teams generating product lifestyle images
- Digital content teams managing multi-platform content libraries

**User Personas:**
- Creative Director: Needs style consistency and brand compliance
- Production Manager: Requires batch processing and workflow efficiency
- Content Strategist: Demands personalization and regional variations
- Technical Artist: Expects integration with existing tools (Unity, CMS)

### Value Proposition

AssetQL transforms AI image generation from a creative tool into a production-grade asset factory by:

- Automating bulk generation of 100-500+ style-consistent assets
- Reducing asset production time from days to hours
- Ensuring brand consistency through style locking mechanisms
- Eliminating manual tagging and organization overhead
- Providing seamless integration with existing creative pipelines
- Enabling personalization at scale (regional, seasonal, campaign-specific)

### Scope of MVP (Hackathon-Ready)

**In Scope:**
- Style reference upload and embedding extraction
- CSV-based bulk prompt input (100-500 items)
- Queue-based batch image generation
- Basic AI auto-tagging and categorization
- S3 storage with CloudFront delivery
- Simple dashboard for batch monitoring
- Export functionality with basic format options
- AWS + KIRO integration

**Out of Scope (Post-MVP):**
- Advanced collaboration features (commenting, approval workflows)
- Video or multi-modal content generation
- Marketplace for style templates
- Advanced analytics and reporting
- Plugin ecosystem
- Real-time collaborative editing

## 2. Business Requirements

### Market Opportunity

**Market Size:**
- Global AI image generation market: $400M+ (2024)
- Creative automation software: $8B+ addressable market
- Target segment (production-scale teams): $1.2B opportunity

**Market Gap:**
Current solutions (Midjourney, DALL-E, Stable Diffusion) focus on individual creation. No solution addresses:
- Production-scale batch processing
- Style consistency enforcement
- Asset lifecycle management
- Integration with creative pipelines

### Differentiation

**Competitive Advantages:**

1. **Production-Scale Focus**: Built for 100-500+ asset batches, not individual images
2. **Style Consistency Engine**: Proprietary style locking and deviation scoring
3. **Workflow Automation**: End-to-end pipeline from prompt to distribution
4. **Asset Intelligence**: AI-powered tagging, categorization, and search
5. **Platform Integration**: Direct export to Unity, CMS, e-commerce platforms
6. **Cost Efficiency**: Serverless architecture optimized for batch economics

**vs. Midjourney**: No batch automation, manual style consistency, no asset management
**vs. Stable Diffusion**: Requires technical setup, no workflow orchestration, no lifecycle management
**vs. Adobe Firefly**: Limited batch capabilities, no style locking, enterprise pricing

### Expected Outcomes

**Hackathon Deliverables:**
- Functional MVP demonstrating end-to-end workflow
- Working demo: 100 style-consistent images generated from CSV
- Dashboard showing batch progress and asset library
- Technical architecture deployed on AWS
- Integration with KIRO for workflow orchestration

**Business Outcomes:**
- Demonstrate 70%+ time reduction in bulk asset production
- Achieve 85%+ style consistency score across batches
- Validate serverless cost model (<$0.50 per asset)
- Secure pilot customers from hackathon demo

### Success Metrics (KPIs)

**Production Efficiency:**
- Time reduction: 70%+ decrease vs. manual workflow
- Batch completion rate: 95%+ successful generation
- Processing throughput: 100 assets in <30 minutes
- Retry success rate: 90%+ failed jobs recovered

**Quality Metrics:**
- Style consistency score: 85%+ similarity to reference
- Style deviation: <15% variance across batch
- Asset tagging accuracy: 90%+ correct auto-tags
- User satisfaction: 4.5/5 rating on style consistency

**Technical Performance:**
- API response time: <200ms (non-generation endpoints)
- Queue processing latency: <5 seconds per job dispatch
- Storage retrieval: <1 second via CloudFront
- System uptime: 99.5%+ availability

**Cost Efficiency:**
- Cost per asset: <$0.50 (compute + storage + AI)
- Infrastructure cost: <$200/month for MVP
- Scaling efficiency: Linear cost growth with volume

## 3. Functional Requirements

### 3.1 Style Engine

**FR-SE-001: Style Reference Upload**
- User can upload 1-5 reference images (JPEG, PNG, WebP)
- Maximum file size: 10MB per image
- System validates image format and dimensions
- Preview displayed before processing

**FR-SE-002: Style Embedding Extraction**
- System extracts style embeddings using vision model
- Embeddings capture: color palette, composition, texture, lighting, artistic style
- Processing time: <10 seconds per reference image
- Embeddings stored in DynamoDB with reference ID

**FR-SE-003: Style Parameter Locking**
- User can lock specific style parameters: color scheme, composition style, lighting mood, texture detail
- Locked parameters enforced across all batch generations
- Parameter weights adjustable (0-100% influence)
- Style profile saved for reuse

**FR-SE-004: Style Deviation Scoring**
- System calculates similarity score between generated image and reference
- Scoring algorithm: CLIP-based semantic similarity + color histogram analysis
- Deviation threshold: User-configurable (default: 85% similarity)
- Images below threshold flagged for review or auto-regeneration

**FR-SE-005: Style Profile Management**
- User can save style profiles with custom names
- Style profiles include: reference images, locked parameters, deviation thresholds
- User can load existing style profiles for new batches
- Style profile library with search and filter

### 3.2 Bulk Generation Engine

**FR-BG-001: CSV Upload Interface**
- User uploads CSV file with batch prompts
- CSV format: columns for prompt, variant_id, category, metadata
- Support for 100-500 rows per batch
- CSV validation with error reporting (missing columns, invalid formats)

**FR-BG-002: Prompt Templating System**
- User defines prompt template with variables: `{subject}`, `{action}`, `{environment}`, `{style_modifier}`
- Template applied to all CSV rows
- Variable substitution from CSV columns
- Template preview before batch execution

**FR-BG-003: Batch Configuration**
- User configures: image dimensions (512x512, 1024x1024, custom), generation model (Stable Diffusion, custom), quality settings, number of variations per prompt
- Configuration saved with batch metadata
- Batch naming and description

**FR-BG-004: Queue-Based Processing**
- Batch jobs split into individual generation tasks
- Tasks pushed to Amazon SQS queue
- KIRO orchestrates queue consumption and parallel processing
- Queue priority: user-defined or FIFO

**FR-BG-005: Parallel Image Generation**
- Multiple Lambda functions process queue concurrently
- Concurrency limit: User-configurable (default: 10 parallel)
- Load balancing across available compute
- Progress tracking per task

**FR-BG-006: Retry Logic for Failed Jobs**
- Failed generations automatically retry (max 3 attempts)
- Exponential backoff between retries
- Failure reasons logged: timeout, model error, style deviation
- Manual retry option for persistent failures

**FR-BG-007: Status Tracking Dashboard**
- Real-time batch progress: queued, processing, completed, failed
- Progress bar with percentage completion
- Estimated time remaining
- Detailed task-level status view
- Notification on batch completion

### 3.3 Asset Management System

**FR-AM-001: AI Auto-Tagging**
- Generated images automatically tagged using vision-language model
- Tag categories: objects, scenes, colors, mood, style, composition
- Minimum 5 tags per image
- Tag confidence scores displayed

**FR-AM-002: Smart Categorization**
- Images automatically categorized based on: CSV metadata, prompt content, visual analysis
- Category hierarchy: primary category, subcategories
- User can override auto-categorization
- Category-based filtering in asset library

**FR-AM-003: Naming Convention Automation**
- Images named using configurable pattern: `{batch_name}_{variant_id}_{timestamp}_{hash}`
- Naming pattern supports: batch metadata, CSV columns, sequential numbering, custom prefixes
- Collision prevention with unique identifiers
- Bulk rename functionality

**FR-AM-004: Version Control**
- Each regeneration creates new version
- Version history tracked per asset
- User can compare versions side-by-side
- Rollback to previous version
- Version metadata: timestamp, generation parameters, style score

**FR-AM-005: Search Functionality**
- Search by: tags, categories, batch name, date range, style profile
- Full-text search in metadata
- Visual similarity search (find similar images)
- Advanced filters: style score, dimensions, file size
- Search results with thumbnail preview

**FR-AM-006: Asset Library Interface**
- Grid view with thumbnail previews
- List view with metadata columns
- Sorting: date, name, style score, category
- Bulk selection and actions
- Asset detail view with full metadata

### 3.4 Personalization Module

**FR-PM-001: Regional Language Support**
- Prompt templates support multiple languages
- Language-specific prompt optimization
- CSV can include language column for per-row localization
- Supported languages (MVP): English, Spanish, French, German, Japanese

**FR-PM-002: Festival/Seasonal Variations**
- Predefined seasonal modifiers: holiday themes, seasonal colors, cultural elements
- User selects seasonal context for batch
- Seasonal modifiers applied to prompt template
- Seasonal tag auto-added to assets

**FR-PM-003: Campaign-Specific Variations**
- User defines campaign parameters: brand colors, campaign theme, target audience, messaging tone
- Campaign profile applied to batch generation
- Campaign metadata tracked with assets
- Campaign-based asset filtering

**FR-PM-004: Dynamic Variable Substitution**
- CSV supports dynamic variables beyond basic prompts
- Variables: regional preferences, demographic targeting, platform-specific requirements
- Conditional logic in templates (if/else based on CSV values)
- Variable validation before batch execution

### 3.5 Distribution Module

**FR-DM-001: Export to Unity**
- Export assets as Unity-compatible package
- Metadata exported as JSON for Unity import
- Texture format optimization (PNG, TGA)
- Folder structure matches Unity conventions
- Direct Unity Asset Store integration (post-MVP)

**FR-DM-002: Export to CMS**
- Export to common CMS platforms: WordPress, Contentful, Strapi
- API integration for direct upload
- Metadata mapping to CMS fields
- Bulk upload with progress tracking

**FR-DM-003: Export to E-commerce Platforms**
- Export to: Shopify, WooCommerce, Magento
- Product image format requirements met
- Multiple size variants generated
- SKU-based naming if CSV includes SKU column

**FR-DM-004: Auto-Resize for Platform Formats**
- Predefined platform presets: Instagram (1080x1080, 1080x1350), Facebook (1200x630), Twitter (1200x675), LinkedIn (1200x627), Pinterest (1000x1500)
- Custom dimension presets
- Batch resize all assets to selected formats
- Maintains aspect ratio or crops intelligently

**FR-DM-005: CDN Link Generation**
- All assets served via CloudFront CDN
- Public shareable links generated
- Link expiration options (permanent, 7 days, 30 days, custom)
- Bulk link export as CSV or JSON
- Embed code generation for web use

**FR-DM-006: Download Options**
- Download individual assets
- Bulk download as ZIP
- Download by category or batch
- Original quality or compressed options
- Download history tracking

### 3.6 Collaboration (MVP Light)

**FR-CL-001: Basic Team Workspace**
- Multiple users can access shared workspace
- Workspace-level asset library
- Shared style profiles and templates
- User activity log (who generated what)

**FR-CL-002: Role-Based Access Control**
- Roles: Admin, Creator, Viewer
- Admin: Full access, user management, billing
- Creator: Generate batches, manage assets, export
- Viewer: View assets, download only
- Role assignment per user

**FR-CL-003: Batch Ownership**
- Batches tagged with creator user
- Filter assets by creator
- Transfer batch ownership (Admin only)

**FR-CL-004: Basic Commenting (Optional for MVP)**
- Users can comment on individual assets
- Comment thread per asset
- Notification on new comments
- Comment search

## 4. Non-Functional Requirements

### NFR-001: Scalability

**Queue-Based Serverless Architecture:**
- System must handle 1-10 concurrent batches
- Queue depth: Support 5,000+ pending tasks
- Auto-scaling Lambda functions based on queue depth
- Horizontal scaling without manual intervention
- Cost scales linearly with usage

**Storage Scalability:**
- S3 storage: Unlimited asset storage
- DynamoDB: Auto-scaling read/write capacity
- CloudFront: Global CDN distribution

### NFR-002: Availability

- System uptime: 99.5% availability target
- Graceful degradation: Dashboard accessible even if generation is down
- Queue persistence: No job loss during system failures
- Multi-AZ deployment for critical components

### NFR-003: Performance

**Parallel Processing:**
- 10+ concurrent image generations
- Queue processing latency: <5 seconds per task dispatch
- Lambda cold start: <3 seconds
- Warm Lambda execution: <500ms overhead

**API Performance:**
- REST API response time: <200ms (95th percentile)
- Dashboard load time: <2 seconds
- Asset thumbnail loading: <500ms via CDN
- Search query response: <1 second

**Generation Performance:**
- Image generation time: 5-15 seconds per image (model-dependent)
- Batch of 100 images: <30 minutes total
- Style embedding extraction: <10 seconds per reference

### NFR-004: Security

**AWS IAM Roles:**
- Principle of least privilege for all services
- Lambda execution roles scoped to required resources
- S3 bucket policies: Private by default, public read via CloudFront only
- API Gateway authentication required

**Data Security:**
- Encryption at rest: S3 server-side encryption (SSE-S3)
- Encryption in transit: TLS 1.2+ for all API calls
- Secure credential management: AWS Secrets Manager
- No hardcoded credentials in code

**Access Control:**
- JWT-based authentication for API
- Session management with secure tokens
- Rate limiting: 100 requests/minute per user
- CORS policies for frontend

### NFR-005: Cost-Efficiency

**Serverless-First:**
- Pay-per-use model: No idle compute costs
- Lambda pricing: <$0.10 per 100 invocations
- S3 storage: Standard tier for active assets, Glacier for archives
- DynamoDB on-demand pricing for MVP

**Cost Targets:**
- Cost per asset: <$0.50 (compute + storage + AI inference)
- Monthly infrastructure: <$200 for MVP usage
- AI model costs: Optimize with batch inference

### NFR-006: Maintainability

- Infrastructure as Code: CloudFormation or Terraform
- Modular architecture: Loosely coupled services
- Comprehensive logging: CloudWatch Logs for all services
- Error tracking: Structured error logs with context
- Monitoring: CloudWatch dashboards for key metrics

### NFR-007: Extensibility

- Plugin architecture for new export formats
- Configurable AI model backends (swap Stable Diffusion, DALL-E, custom)
- Webhook support for external integrations
- REST API for third-party tool integration
- Modular frontend components

## 5. Constraints

### Technical Constraints

**CONS-001: AWS Services Mandatory**
- All infrastructure must run on AWS
- No multi-cloud deployment for MVP
- Leverage AWS-native services where possible

**CONS-002: KIRO Integration Required**
- KIRO must orchestrate workflow logic
- Batch coordination handled by KIRO
- KIRO manages queue consumption and task distribution

**CONS-003: Hackathon Timeline**
- MVP must be functional within hackathon timeframe (48-72 hours)
- Focus on core workflow: upload → generate → manage → export
- UI can be minimal but functional
- Advanced features deferred to post-MVP

**CONS-004: AI Model Constraints**
- Use AWS Bedrock or SageMaker for model hosting
- Model selection limited to available AWS options
- Custom model training out of scope for MVP
- Inference latency dependent on model choice

### Resource Constraints

**CONS-005: Budget Limitations**
- AWS free tier usage where possible
- Cost optimization required for demo
- Limit concurrent generations to control costs
- Use spot instances if EC2 required

**CONS-006: Team Size**
- Small team (1-4 developers)
- Limited time for complex features
- Prioritize core functionality over polish

### Scope Constraints

**CONS-007: MVP Feature Limits**
- No advanced collaboration (approval workflows, real-time editing)
- No video or 3D asset generation
- No marketplace or template sharing
- No mobile app (web-only)
- Limited analytics and reporting

## 6. Assumptions

### User Assumptions

**ASMP-001: Structured CSV Input**
- Users can provide well-formatted CSV files
- Users understand basic prompt engineering
- CSV includes required columns (prompt, variant_id minimum)

**ASMP-002: Style Reference Provided**
- Users have reference images for style consistency
- Reference images are high-quality and representative
- Users understand style locking concept

**ASMP-003: Technical Proficiency**
- Users comfortable with web-based tools
- Users understand basic asset management concepts
- Users can configure export settings

### Technical Assumptions

**ASMP-004: AWS Infrastructure Available**
- AWS account with sufficient permissions
- Access to required AWS services (Lambda, S3, SQS, DynamoDB, Bedrock/SageMaker)
- No organizational restrictions on service usage

**ASMP-005: AI Model Hosted**
- Stable Diffusion or equivalent available on SageMaker/Bedrock
- Model inference API accessible
- Model supports batch inference or rapid sequential calls

**ASMP-006: KIRO Integration**
- KIRO can be integrated with AWS services
- KIRO supports workflow orchestration patterns required
- KIRO API/SDK available for integration

### Business Assumptions

**ASMP-007: Market Demand**
- Target users have pain point with bulk generation
- Users willing to adopt new workflow tool
- Price point acceptable for target market

**ASMP-008: Competitive Landscape**
- No direct competitor launches similar solution during development
- Market gap remains valid
- Differentiation factors remain relevant

## 7. Risks & Mitigation

### Technical Risks

**RISK-001: Style Inconsistency Across Batch**
- **Risk**: Generated images vary significantly in style despite reference
- **Impact**: High - Core value proposition compromised
- **Probability**: Medium
- **Mitigation**:
  - Implement style deviation scoring with auto-regeneration
  - Use CLIP embeddings for semantic similarity enforcement
  - Allow user to adjust style influence weights
  - Provide style consistency report per batch

**RISK-002: High Compute Costs**
- **Risk**: AI inference costs exceed budget, especially at scale
- **Impact**: High - Business model viability threatened
- **Probability**: Medium
- **Mitigation**:
  - Queue-based throttling to control concurrent generations
  - Use spot instances or reserved capacity for cost savings
  - Implement cost monitoring and alerts
  - Optimize batch sizes for inference efficiency
  - Consider lower-cost models for non-critical generations

**RISK-003: Model Latency**
- **Risk**: Image generation takes too long, poor user experience
- **Impact**: Medium - User satisfaction affected
- **Probability**: Medium
- **Mitigation**:
  - Async processing with progress notifications
  - Set clear expectations on generation time
  - Optimize model inference (batch inference, caching)
  - Use faster models for preview/draft mode

**RISK-004: Queue Bottlenecks**
- **Risk**: SQS queue overwhelmed during peak usage
- **Impact**: Medium - Delayed processing, poor UX
- **Probability**: Low
- **Mitigation**:
  - Monitor queue depth and processing rate
  - Auto-scale Lambda concurrency based on queue metrics
  - Implement queue priority for urgent batches
  - Set queue depth alerts

**RISK-005: Integration Complexity with KIRO**
- **Risk**: KIRO integration more complex than anticipated
- **Impact**: High - Core requirement, blocks MVP
- **Probability**: Medium
- **Mitigation**:
  - Early proof-of-concept for KIRO integration
  - Fallback to direct Lambda orchestration if needed
  - Engage KIRO support/documentation early
  - Modular design allows KIRO to be swapped

### Business Risks

**RISK-006: Insufficient Differentiation**
- **Risk**: Competitors add similar features, reducing uniqueness
- **Impact**: High - Market positioning weakened
- **Probability**: Low (short-term)
- **Mitigation**:
  - Focus on workflow automation, not just generation
  - Build strong asset management moat
  - Rapid iteration based on user feedback
  - Patent or protect proprietary style consistency algorithms

**RISK-007: User Adoption Barriers**
- **Risk**: Users find workflow too complex or different from current tools
- **Impact**: Medium - Slow adoption, low engagement
- **Probability**: Medium
- **Mitigation**:
  - Intuitive UI/UX design
  - Comprehensive onboarding and tutorials
  - Provide CSV templates and examples
  - Offer migration tools from existing workflows

### Operational Risks

**RISK-008: Data Loss**
- **Risk**: Generated assets lost due to storage failure
- **Impact**: High - User trust destroyed
- **Probability**: Low
- **Mitigation**:
  - S3 versioning enabled
  - Cross-region replication for critical assets
  - Regular backup verification
  - User-facing export/download options

**RISK-009: Security Breach**
- **Risk**: Unauthorized access to user assets or data
- **Impact**: Critical - Legal, reputational damage
- **Probability**: Low
- **Mitigation**:
  - AWS security best practices (IAM, encryption)
  - Regular security audits
  - Penetration testing before public launch
  - Incident response plan

**RISK-010: Scalability Limits**
- **Risk**: System cannot handle growth beyond MVP scale
- **Impact**: Medium - Growth constrained
- **Probability**: Low (MVP phase)
- **Mitigation**:
  - Design for horizontal scaling from start
  - Load testing before scaling
  - Monitor performance metrics continuously
  - Plan architecture evolution for 10x scale

---

## Document Metadata

- **Version**: 1.0
- **Last Updated**: 2026-02-15
- **Status**: Draft
- **Owner**: Product Architecture Team
- **Reviewers**: Engineering Lead, Design Lead, Business Stakeholder
