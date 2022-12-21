const height = 600;
const width = 600;
const boundary = 25;

function createParticles(n) {
  const particles = [];

  for (var i = 0; i < n; i++) {
    particles.push({
      position: { x: Math.random() * width, y: Math.random() * height },
      velocity: { x: 0, y: 0 },
    });
  }

  return particles;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function start() {
  const particles = createParticles(4000);

  for (var i = 0; i < 10000; i++) {
    if (i % 3 == 0) {
      draw(particles);
      if (
        i > 100 &&
        hasStopped(
          particles.filter((p) => {
            !isOutOfBounds(p);
          }),
          0.2
        )
      ) {
        console.log("Has stopped");
        break;
      }
    }
    updatePositions(particles);
    updateVelocities(particles);
    await sleep(1);
  }

  console.log("The end");
}

function draw(particles) {
  const canvas = document.getElementById("canvas");

  if (canvas.getContext) {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgb(200, 0, 0)";
    const startAngle = 0;
    const endAngle = Math.PI * 2;

    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, 4, startAngle, endAngle);
      ctx.fill();
    });
  }
}

function subtractVector(v, w) {
  return { x: v.x - w.x, y: v.y - w.y };
}

function addVector(v, w) {
  return { x: v.x + w.x, y: v.y + w.y };
}

function scaleVector(v, scale) {
  return { x: v.x * scale, y: v.y * scale };
}

function unitVector(v) {
  if (v.x == 0 && v.y == 0) {
    throw "Can't make unit vector from zero";
  }
  const length = Math.sqrt(lengthSquared(v));
  return scaleVector(v, 1 / length);
}

function lengthSquared(v) {
  return v.x * v.x + v.y * v.y;
}

function updatePositions(particles) {
  particles.forEach((p) => {
    p.position = addVector(p.position, p.velocity);
  });
}

function isOutOfBounds(particle) {
  return isOutOfHorizontalBounds(particle) || isOutOfVerticalBounds(particle);
}

function isOutOfHorizontalBounds(particle) {
  return (
    particle.position.x < -boundary || particle.position.x > width + boundary
  );
}

function isOutOfVerticalBounds(particle) {
  return (
    particle.position.y < -boundary || particle.position.y > height + boundary
  );
}

function hasStopped(particles, maxSpeed) {
  maxSpeedSquared = maxSpeed * maxSpeed;
  return particles.every((p) => {
    return lengthSquared(p.velocity) < maxSpeedSquared;
  });
}

function closestParticles(particle, particles, range) {
  rangeSquared = range * range;
  return particles.filter((q) => {
    return (
      lengthSquared(subtractVector(particle.position, q.position)) <
      rangeSquared
    );
  });
}

function updateVelocities(particles) {
  scalar = 32;
  friction = 0.1;

  particles.forEach((p) => {
    closestParticles(p, particles, 30).forEach((q) => {
      if (!(p.position.x == q.position.x && p.position.y == q.position.y)) {
        diff = subtractVector(p.position, q.position);
        force = Math.min(scalar / lengthSquared(diff), 3);
        change = scaleVector(unitVector(diff), force);
        p.velocity = addVector(p.velocity, change);
      }
    });

    if (isOutOfHorizontalBounds(p)) {
      p.velocity.x = Math.random() - 0.5;
    }

    if (isOutOfVerticalBounds(p)) {
      p.velocity.y = Math.random() - 0.5;
    }

    p.velocity = scaleVector(p.velocity, 1 - friction);
  });
}
