import * as migration_20261113_205813_initial from './20261113_205813_initial';
import * as migration_20261113_210722_storage_object_key from './20261113_210722_storage_object_key';

export const migrations = [
  {
    up: migration_20261113_205813_initial.up,
    down: migration_20261113_205813_initial.down,
    name: '20261113_205813_initial',
  },
  {
    up: migration_20261113_210722_storage_object_key.up,
    down: migration_20261113_210722_storage_object_key.down,
    name: '20261113_210722_storage_object_key'
  },
];
