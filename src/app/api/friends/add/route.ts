import { fetchRedis } from '@/helpers/redis';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { addFriendValidator } from '@/lib/validations/add-friend';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { email: emailToAdd } = addFriendValidator.parse(body.email);

    const idToAdd = (await fetchRedis(
      'get',
      `user:email:${emailToAdd}`
    )) as string;

    if (!idToAdd) {
      return new Response("This person doesn't exist", {
        status: 400,
      });
    }

    const getSession = await getServerSession(authOptions);

    if (!getSession) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }

    if (idToAdd === getSession.user.id) {
      return new Response("You can't add yourself as friend", {
        status: 400,
      });
    }

    //check user already added
    const isAlreadyAdded = (await fetchRedis(
      'sismember',
      `user:${idToAdd}:incoming_friend_requests`,
      getSession.user.id
    )) as 0 | 1;

    if (isAlreadyAdded) {
      return new Response('Already added this user', { status: 400 });
    }

    //check user already added
    const isAlreadyFriends = (await fetchRedis(
      'sismember',
      `user:${getSession.user.id}:friends`,
      idToAdd
    )) as 0 | 1;

    if (isAlreadyFriends) {
      return new Response('Already friends with this user', { status: 400 });
    }
    //vaild friend request
    db.sadd(`user:${idToAdd}:incoming_friend_requests`, getSession.user.id);
    return new Response('OK');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response('Invalid request payload', { status: 422 });
    }

    return new Response('Invalid request', { status: 400 });
  }
}
