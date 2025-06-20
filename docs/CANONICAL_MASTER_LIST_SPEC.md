# Canonical Master List Specification

## Overview

The Canonical Master List is the heart of the V2 pipeline architecture, serving as the single source of truth for all university identities across ranking systems. This document defines the structure, conventions, and management procedures for this critical component.

## Purpose and Role

### Strategic Importance
- **Single Source of Truth**: Eliminates duplicate and conflicting university entries
- **Unified Matching Target**: All ranking sources match against this authoritative list
- **Scalable Architecture**: Supports addition of new ranking sources without code changes
- **Data Quality Assurance**: Enforces consistent naming and identification standards

### Pipeline Integration
```
Raw Rankings → Normalization → Matching Against Canonical List → Aggregated Results
                                        ↑
                              Single Source of Truth
```

## Schema Structure

### Core Required Fields

#### `canonical_id` (String, Required)
- **Format**: `canonical-NNNN` where NNNN is a 4-digit zero-padded number
- **Pattern**: `^canonical-[0-9]{4}$`
- **Examples**: `canonical-0001`, `canonical-1729`
- **Purpose**: Unique, immutable identifier for each university
- **Generation**: Sequential assignment starting from canonical-0001

#### `canonical_name` (String, Required)
- **Length**: 2-200 characters
- **Purpose**: Official, preferred name of the university
- **Standards**: 
  - Use full official name in English
  - Avoid abbreviations unless that's the official form
  - Use consistent formatting (e.g., "University of X" vs "X University")
- **Examples**:
  - `"Massachusetts Institute of Technology"`
  - `"University of Cambridge"`
  - `"Swiss Federal Institute of Technology Zurich"`

#### `country` (String, Required)
- **Length**: 2-50 characters
- **Purpose**: Standardized country identifier
- **Standards**: Follow V2 pipeline country standardization rules
- **Examples**: `"USA"`, `"UK"`, `"China"`, `"Germany"`, `"Australia"`
- **Source**: Based on battle-tested mappings from existing analysis

#### `aliases` (Array, Required)
- **Purpose**: All known name variations for matching purposes
- **Requirements**:
  - Minimum 1 entry
  - All entries must be unique
  - Maximum 200 characters per alias
- **Contents Should Include**:
  - Official university name
  - Common abbreviations and acronyms
  - Historical names
  - Alternative translations
  - Common misspellings (if frequent)
  - Names from different ranking sources
- **Example**:
  ```json
  [
    "MIT",
    "Massachusetts Institute of Technology", 
    "M.I.T.",
    "MIT Cambridge",
    "Massachusetts Institute of Technology - MIT"
  ]
  ```

### Optional Metadata Fields

#### `metadata` Object
Provides additional context and information about the university:

##### Academic Information
- **`founding_year`**: Integer (800-2100) - University founding year
- **`institution_type`**: Enum - Primary institutional classification
  - Values: `university`, `college`, `institute`, `school`, `academy`, `polytechnic`, `conservatory`, `seminary`
- **`specializations`**: Array - Major academic focus areas
  - Values: `technology`, `medicine`, `business`, `arts`, `sciences`, `engineering`, `law`, `education`, `agriculture`, `comprehensive`

##### Operational Information  
- **`public_private`**: Enum - Funding structure
  - Values: `public`, `private`, `mixed`, `unknown`
- **`student_enrollment`**: Integer - Approximate total enrollment
- **`languages`**: Array - Primary languages of instruction
- **`website`**: String (URI) - Official university website

##### Geographic Information
- **`city`**: String - Primary city location
- **`region_state`**: String - State, province, or region

#### `sources` Object
Tracks which ranking sources include this university:

```json
{
  "qs": {
    "included": true,
    "best_rank": 1,
    "years_included": [2020, 2021, 2022, 2023, 2024, 2025, 2026]
  },
  "the": {
    "included": true, 
    "best_rank": 2,
    "years_included": [2020, 2021, 2022, 2023, 2024]
  },
  "arwu": {
    "included": true,
    "best_rank": 4,
    "years_included": [2020, 2021, 2022, 2023, 2024]
  },
  "usnews": {
    "included": false
  }
}
```

#### System Fields
- **`created_date`**: ISO 8601 timestamp of entry creation
- **`updated_date`**: ISO 8601 timestamp of last modification
- **`version`**: Semantic version (e.g., "1.0.0")
- **`confidence_score`**: Float (0.0-1.0) indicating entry reliability
- **`notes`**: Free-form notes (max 1000 characters)

## ID Generation Strategy

### Sequential Assignment
- Start with `canonical-0001`
- Increment sequentially for each new university
- Zero-pad to 4 digits
- Do not reuse IDs even if entries are deleted

### ID Assignment Process
1. **Check Existing IDs**: Find highest existing canonical_id
2. **Increment**: Add 1 to highest number
3. **Format**: Zero-pad to 4 digits with "canonical-" prefix
4. **Validate**: Ensure ID doesn't already exist
5. **Assign**: Use new ID for university entry

### ID Persistence
- **Immutable**: IDs never change once assigned
- **Permanent**: IDs not reused even if university removed
- **Global**: IDs unique across entire system
- **Auditable**: ID assignment logged and tracked

## Naming Conventions and Standards

### Canonical Name Selection Criteria

#### Preference Order
1. **Official English name** from university's own website
2. **Most commonly used name** across ranking sources
3. **Longest descriptive name** that provides clarity
4. **Historically established name** in academic literature

#### Standardization Rules
- **Language**: Use English names when available
- **Abbreviations**: Avoid unless that's the official form (e.g., "MIT" is acceptable)
- **Articles**: Include "The" only if it's officially part of the name
- **Punctuation**: Use standard punctuation, avoid excessive commas
- **Consistency**: Maintain consistent patterns (e.g., "University of X" format)

#### Special Cases
- **Multiple Campuses**: Use main campus name, note others in aliases
- **Name Changes**: Use current official name, include historical names in aliases
- **Translation Variations**: Use most widely recognized English version
- **Merger/Split**: Create separate entries, note relationship in metadata

### Alias Management

#### Required Aliases
- The canonical name itself
- Official abbreviations and acronyms
- Names as they appear in each ranking source
- Common alternative spellings

#### Optional Aliases
- Historical names
- Translation variations
- Regional name variations
- Common informal names

#### Alias Quality Guidelines
- **Accuracy**: Only include verified name variations
- **Relevance**: Focus on names that actually appear in data sources
- **Completeness**: Include all significant variations
- **Maintenance**: Regular review and updates

## Validation Rules

### Schema Validation
All entries must validate against the JSON schema:
- Required fields present and properly formatted
- Field types and constraints enforced
- Pattern matching for IDs and structured fields
- Length limits enforced

### Business Logic Validation
- **Unique canonical_id**: No duplicate IDs allowed
- **Unique canonical_name**: No duplicate canonical names
- **Alias uniqueness**: Aliases unique within entry
- **Country validity**: Country matches standardized list
- **Reference integrity**: Source references are valid

### Data Quality Checks
- **Name reasonableness**: Names appear to be actual universities
- **Country consistency**: University location matches country
- **Alias consistency**: Aliases are reasonable variations
- **Metadata coherence**: Optional fields are sensible

## File Structure and Format

### File Organization
- **Primary File**: `canonical-universities.json`
- **Location**: Project root directory
- **Format**: JSON array of university objects
- **Encoding**: UTF-8
- **Size Management**: Single file unless size becomes problematic

### File Format
```json
[
  {
    "canonical_id": "canonical-0001",
    "canonical_name": "Massachusetts Institute of Technology",
    "country": "USA",
    "aliases": [
      "MIT",
      "Massachusetts Institute of Technology",
      "M.I.T.",
      "MIT Cambridge",
      "Massachusetts Institute of Technology - MIT"
    ],
    "metadata": {
      "founding_year": 1861,
      "institution_type": "institute",
      "public_private": "private",
      "city": "Cambridge",
      "region_state": "Massachusetts",
      "website": "https://web.mit.edu/",
      "specializations": ["technology", "engineering", "sciences"]
    },
    "sources": {
      "qs": {"included": true, "best_rank": 1},
      "the": {"included": true, "best_rank": 2},
      "arwu": {"included": true, "best_rank": 4},
      "usnews": {"included": true, "best_rank": 2}
    },
    "created_date": "2024-06-20T00:00:00Z",
    "updated_date": "2024-06-20T00:00:00Z",
    "version": "1.0.0",
    "confidence_score": 1.0
  }
]
```

## Management Procedures

### Initial Creation (Seeding)
1. **Extract from existing manual mappings** (`manual-university-mapping.json`)
2. **Analyze current aggregated data** for university names
3. **Generate canonical entries** with proper IDs and structure
4. **Validate all entries** against schema and business rules
5. **Review and approve** canonical names and aliases

### Ongoing Maintenance

#### Adding New Universities
1. **Identify need**: University appears in ranking but not in canonical list
2. **Research university**: Verify official information
3. **Generate entry**: Create canonical entry with new ID
4. **Validate entry**: Check against schema and rules
5. **Update aliases**: Ensure comprehensive alias coverage
6. **Commit changes**: Add to canonical list with audit trail

#### Updating Existing Entries
1. **Identify change**: Name variation, metadata update, or correction needed
2. **Preserve ID**: Never change canonical_id
3. **Update fields**: Modify canonical_name, aliases, or metadata as needed
4. **Increment version**: Update version number and updated_date
5. **Document change**: Add notes explaining the modification
6. **Validate update**: Ensure all rules still satisfied

#### Merging Duplicates
1. **Identify duplicates**: Universities with multiple canonical entries
2. **Choose primary**: Select most complete/accurate entry
3. **Merge aliases**: Combine all aliases from duplicate entries
4. **Update metadata**: Merge relevant metadata fields
5. **Remove duplicate**: Mark duplicate as deprecated (don't delete)
6. **Update references**: Ensure all systems reference primary entry

### Quality Assurance

#### Regular Audits
- **Monthly review**: Check for new duplicates or inconsistencies
- **Quarterly validation**: Full schema and business rule validation
- **Annual cleanup**: Review aliases, update metadata, check sources
- **Ad-hoc reviews**: When new ranking sources added or major changes

#### Validation Tools
- **Schema validator**: Automated checking against JSON schema
- **Business rule checker**: Custom validation for business logic
- **Duplicate detector**: Algorithm to find potential duplicates
- **Data quality reporter**: Statistics and quality metrics

## Integration with Pipeline

### Matching Process Integration
1. **Load canonical list**: Read full canonical list into memory
2. **Preprocess for matching**: Create search indexes and lookup tables
3. **Match against aliases**: Use multi-tier matching against alias arrays
4. **Return canonical_id**: Successful matches return canonical_id and canonical_name
5. **Handle misses**: Unmatched universities go to manual review

### Performance Considerations
- **Memory usage**: Entire list loaded into memory for fast matching
- **Search optimization**: Create lookup tables for common searches
- **Index management**: Maintain indexes for aliases and country filtering
- **Caching strategy**: Cache frequently accessed entries

### Backup and Recovery
- **Version control**: Track all changes in git repository
- **Backup frequency**: Daily automated backups
- **Recovery procedures**: Documented restore procedures
- **Change auditing**: Complete audit trail of all modifications

## Success Metrics

### Quality Metrics
- **Coverage rate**: Percentage of ranking universities in canonical list
- **Accuracy rate**: Percentage of canonical entries that are correct
- **Completeness rate**: Percentage of entries with comprehensive aliases
- **Consistency rate**: Percentage of entries following naming conventions

### Performance Metrics
- **Matching speed**: Time to match university against canonical list
- **Load time**: Time to load canonical list into memory
- **Update frequency**: How often canonical list is updated
- **Error rate**: Frequency of validation errors or inconsistencies

### Growth Metrics
- **List size**: Total number of canonical entries
- **Alias coverage**: Average number of aliases per entry
- **Source coverage**: Percentage of entries appearing in each ranking source
- **Automation rate**: Percentage of matches automated vs manual

## Future Considerations

### Scalability Plans
- **File splitting**: Strategy for splitting large canonical lists
- **Database migration**: Transition to database if needed
- **Distributed matching**: Parallel processing for large datasets
- **API development**: RESTful API for canonical list access

### Enhanced Features
- **Similarity scoring**: Confidence scores for alias matches
- **Relationship tracking**: Parent/subsidiary university relationships
- **Historical tracking**: Track university name changes over time
- **Multilingual support**: Non-English canonical names and aliases

### Integration Opportunities
- **External databases**: Integration with official university databases
- **Collaborative editing**: Multi-user editing with conflict resolution
- **Automated discovery**: AI-powered discovery of new universities
- **Quality crowdsourcing**: Community-driven quality improvements

---

This specification provides the foundation for a robust, scalable, and maintainable canonical university master list that will serve as the cornerstone of the V2 pipeline architecture.