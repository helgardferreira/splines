import { Subject } from 'rxjs';
import { type Spring } from 'wobble';

export const fromSpring = (spring: Spring) => {
  const springSubject = new Subject<{
    currentValue?: number;
    currentVelocity?: number;
  }>();

  spring
    .onUpdate(({ currentValue, currentVelocity }) =>
      springSubject.next({ currentValue, currentVelocity })
    )
    .onStop(() => springSubject.complete());

  return springSubject.asObservable();
};
