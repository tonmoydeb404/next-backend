// Barrel for repository providers; DatabaseModule spreads these into its providers/exports.
// Add one `{entity}.repository.ts` file per table here as domains are built.
export * from './internal-roles.repository';
export * from './profiles.repository';
export * from './provinces.repository';
export * from './regions.repository';
export * from './seats.repository';
export * from './tenants.repository';
