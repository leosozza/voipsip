/** Router state accepted by /setup. `step` is 1-based, as shown to the user. */
export interface SetupLocationState {
  step?: number;
  error?: string;
}
