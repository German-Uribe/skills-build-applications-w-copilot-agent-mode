import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length === 0) {
    throw Object.assign(new Error('Activity input is required'), { status: 400 });
  }
  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (
    typeof userId !== 'string' || !/^[0-9a-f]{24}$/i.test(userId) ||
    typeof teamId !== 'string' || !/^[0-9a-f]{24}$/i.test(teamId) ||
    typeof type !== 'string' || type.trim().length === 0 ||
    typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0
  ) {
    throw Object.assign(new Error('Activity fields are invalid'), { status: 400 });
  }
  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }
  return Activity.create({ user: user._id, team: team._id, type, minutes, points: minutes, occurredAt: new Date() });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Team input is required'), { status: 400 });
  }
  const { name, mascot, members } = input as Record<string, unknown>;
  if (typeof name !== 'string' || name.trim().length === 0 || typeof mascot !== 'string' || mascot.trim().length === 0) {
    throw Object.assign(new Error('Team name and mascot are required'), { status: 400 });
  }
  const memberIds = members === undefined ? [] : members;
  if (!Array.isArray(memberIds) || memberIds.some((memberId) => typeof memberId !== 'string' || !/^[0-9a-f]{24}$/i.test(memberId))) {
    throw Object.assign(new Error('Team members must be valid user IDs'), { status: 400 });
  }
  return Team.create({ name, mascot, members: memberIds });
}

export async function getLeaderboard() {
  const teams = await Team.aggregate([
    { $lookup: { from: Activity.collection.name, localField: '_id', foreignField: 'team', as: 'activities' } },
    { $project: { _id: 0, teamName: '$name', totalPoints: { $sum: '$activities.points' } } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);
  return teams.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }
  const [recentActivities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean(),
    Workout.find().lean(),
  ]);
  if (workouts.length === 0) return [];

  const activityFocus: Record<string, string> = {
    run: 'endurance',
    cycle: 'endurance',
    walk: 'endurance',
    strength: 'strength',
  };
  const goalWorkout = workouts.find((workout) => workout.focus.toLowerCase() === user.fitnessGoal.toLowerCase());
  const recentActivity = recentActivities.find((activity) => activityFocus[activity.type.toLowerCase()]);
  const recentFocus = recentActivity ? activityFocus[recentActivity.type.toLowerCase()] : undefined;
  const recentWorkout = recentFocus ? workouts.find((workout) => workout.focus.toLowerCase() === recentFocus) : undefined;
  const suggestion = goalWorkout ?? recentWorkout ?? workouts[0];
  const reason = goalWorkout
    ? `Recommended for your ${user.fitnessGoal} goal${recentActivity ? ` and recent ${recentActivity.type} activity` : ''}.`
    : recentWorkout && recentActivity
      ? `Recommended based on your recent ${recentActivity.type} activity.`
      : 'Suggested based on the available workouts.';

  return [{ ...suggestion, reason }];
}

export { User };
