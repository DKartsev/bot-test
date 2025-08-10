import { greet } from '@app/shared';

export default function Home() {
  return <h1>{greet('Admin')}</h1>;
}
