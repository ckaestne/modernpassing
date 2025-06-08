/**
 * positions and movements are specified abstractly and then translated
 * into specific animations in the backend. rendering in the frontend
 * is lightweight and does not do any computations beyond scaling.
 * 
 * That is, the backend determines where each passer (person) is at any
 * given time, what role label they have, and what movements or passes
 * happen from where to where.
 * 
 * Patterns may be long until they fully repeat, but this will be all 
 * precomputed in the backend.
 */

