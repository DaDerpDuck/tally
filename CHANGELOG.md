## [Unreleased]

### Added
- Added stronger typing support by passing an optional Modifier type argument to Property and PropertyDefinition.
  - NumberModifier and BooleanModifier have been added with this typing support.
- Added an internal registerNamed function to clean up repeated registration code.
- Added and exported a registerProperty function for custom property implementations.
- Added and exported ResolvedPropertyDefinition, a type that makes all property definitions required, and DefaultPropertyDefinition, a type that extracts only optional keys from a property definition and then makes it required.
  - Added and exported resolvePropertyDefinition, a helper function that takes a PropertyDefinition and DefaultPropertyDefinition, fills the PropertyDefinition with DefaultPropertyDefinition, and returns a ResolvedPropertyDefinition.
- Added keywords to package.json.

### Changed
- NumberProperty and BooleanProperty now use its define helper function to resolve property definitions, filling with default methods if needed, to instantiate its class.
- Exported Registry and Registrable types.
- Divided AgentState's responsibilities into managers, keeping AgentState as a facade.
- Cleaned up test files.

### Removed
- **[Breaking]** Removed BaseProperty class. Creating custom properties should be done by implementing the Property and Registrable interface. BaseProperty.ts has been renamed to PropertyDefinition.ts.

## [0.1.0] - 2026-08-26

### Added
- Initial public release of Tally.