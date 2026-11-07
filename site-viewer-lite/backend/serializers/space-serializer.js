function serializeSpace(space) {
  return {
    id: space.id,
    name: space.name,
    level: space.level,
    use: space.use,
    x: space.x,
    y: space.y,
    z: space.z,
    w: space.w,
    d: space.d,
    h: space.h
  };
}

module.exports = { serializeSpace };
