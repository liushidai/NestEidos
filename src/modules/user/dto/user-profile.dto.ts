export class UserProfileDto {
  id: string;
  userName: string;
  userType: number;
  userStatus: number;
  createdAt: Date;
  updatedAt: Date;

  static fromUser(user: any): UserProfileDto {
    const userProfile = new UserProfileDto();
    userProfile.id = user.id;
    userProfile.userName = user.userName;
    userProfile.userType = user.userType;
    userProfile.userStatus = user.userStatus;
    userProfile.createdAt = user.createdAt;
    userProfile.updatedAt = user.updatedAt;
    return userProfile;
  }
}