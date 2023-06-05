import { fetchRedis } from '@/helpers/redis';
import { authOptions } from '@/lib/auth';
import { addFriendValidator } from '@/lib/validations/add-friend';
import { getServerSession } from 'next-auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { email: emailToAdd } = addFriendValidator.parse(body.email);

    const RESTResponse = await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/get/user:email${emailToAdd}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        },
        cache: 'no-store',
      }
    );

    const data = (await RESTResponse.json()) as { result: string };
    const idToAdd = data.result;

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
    const isAlreadyAdded = fetchRedis('sismember');
    //vaild req
    console.log(data);
  } catch (error) {}
}