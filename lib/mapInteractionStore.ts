export type MapInteractionBounds =
  | {
      south: number;
      north: number;
      west: number;
      east: number;
      crossesAntimeridian: boolean;
    }
  | null;

export type MapCameraState = {
  zoom: number;
  center: { longitude: number; latitude: number };
  bounds: MapInteractionBounds;
};

export type MapHoverState = {
  cardId: string | null;
  markerId: string | null;
};

export type MapSelectionState = {
  beachId: string | number | null;
};

export type MapInteractionState = {
  camera: MapCameraState | null;
  hover: MapHoverState;
  selection: MapSelectionState;
};

type Listener = () => void;

let state: MapInteractionState = {
  camera: null,
  hover: { cardId: null, markerId: null },
  selection: { beachId: null },
};

const listeners = new Set<Listener>();

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors to keep notifications robust.
    }
  });
};

export const getMapInteractionState = (): MapInteractionState => state;

export const subscribeMapInteraction = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setMapInteractionCamera = (camera: MapCameraState): void => {
  state = { ...state, camera };
  notify();
};

export const setMapInteractionHover = (hover: MapHoverState): void => {
  state = { ...state, hover };
  notify();
};

export const setMapInteractionSelection = (
  selection: MapSelectionState
): void => {
  state = { ...state, selection };
  notify();
};

