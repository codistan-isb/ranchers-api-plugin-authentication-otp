import { generateOtp } from "../util/otp.js";
import { verifyOTP } from "../util/otp.js";
import ReactionError from "@reactioncommerce/reaction-error";
import pkg from "mongodb";
import ObjectID from "mongodb";
const { Long } = pkg;
import password_1 from "@accounts/password";
import server_1 from "@accounts/server";
import { canCreateUser } from "../util/checkUserRole.js";
import { getGroupData } from "../util/getGroupData.js";
import sendOTPToVerifyEmailOTP from "../util/sendOTPToVerifyEmailOTP.js";
export default {
  async sendOTP(parent, args, context, info) {
    const { collections } = context;
    const { users } = collections;
    let msisdn;
    if (args.phone && args.phone.length > 10 && args.phone[0] == "+") {
      msisdn = args.phone;
    } else if (args.email) {
      const userExist = await users.findOne({
        "emails.0.address": args?.email,
      });
      if (!userExist) {
        throw new Error("User does not exist");
      }
      msisdn = userExist.phone;
    } else {
      throw Error("Invalid phone number");
    }

    const res = await generateOtp(msisdn);
    return res;
  },
  async checkUserExist(parent, args, context, info) {
    const { collections } = context;
    const { users } = collections;
    const email = args.email;
    const phone = args.phone;
    let userExist = await users.findOne({ phone: phone });
    if (!userExist) {
      userExist = await users.findOne({ "emails.0.address": email });
    }

    if (userExist !== null) {
      return true;
    } else {
      return false;
    }
  },
  verifyOTP(parent, args, context, info) {
    return verifyOTP(args.phone, args.otp, context);
  },
  resetPassword: async (_, { token, newPassword }, { injector, infos }) => {
    return injector
      .get(password_1.AccountsPassword)
      .resetPassword(token, newPassword, infos);
  },
  sendResetPasswordEmail: async (_, { email }, { injector }, ctx) => {
    const { backgroundJobs, collections } = ctx;
    const accountsServer = injector.get(server_1.AccountsServer);
    const accountsPassword = injector.get(password_1.AccountsPassword);
    try {
      await accountsPassword.sendResetPasswordEmail(email);
    } catch (error) {
      // If ambiguousErrorMessages is true,
      // to prevent user enumeration we fail silently in case there is no user attached to this email
      if (
        accountsServer.options.ambiguousErrorMessages &&
        error instanceof server_1.AccountsJsError &&
        error.code === password_1.SendResetPasswordEmailErrors.UserNotFound
      ) {
        return null;
      }
      throw error;
    }
    return null;
  },
  async createUser(_, { user }, ctx) {
    const { injector, infos, collections, appEvents } = ctx;
    const { Accounts, Groups, BranchData } = collections;
    const accountsServer = injector.get(server_1.AccountsServer);
    const accountsPassword = injector.get(password_1.AccountsPassword);
    let userId;
    let account;
    let AllBranchIDs;
    if (!user.UserRole) {
      try {
        user.UserRole = "customer";
        userId = await accountsPassword.createUser(user);
      } catch (error) {
        // If ambiguousErrorMessages is true we obfuscate the email or username already exist error
        // to prevent user enumeration during user creation
        if (
          accountsServer.options.ambiguousErrorMessages &&
          error instanceof server_1.AccountsJsError &&
          (error.code === password_1.CreateUserErrors.EmailAlreadyExists ||
            error.code === password_1.CreateUserErrors.UsernameAlreadyExists)
        ) {
          return {};
        }
        throw error;
      }
      if (!accountsServer.options.enableAutologin) {
        return {
          userId: accountsServer.options.ambiguousErrorMessages ? null : userId,
        };
      }
      if (userId) {
        const now = new Date();
        const account = {
          _id: userId,
          acceptsMarketing: false,
          emails: [
            {
              address: user.email,
              verified: false,
              provides: "default",
            },
          ],
          name: user.firstName + " " + user.lastName,
          profile: {
            firstName: user.firstName,
            lastName: user.lastName,
            dob: user.dob,
            phone: user.phone,
          },
          UserRole: "customer",
          shopId: "4N3s6SBCET5jn6RGf",
          state: "new",
          userId: userId,
          createdAt: now,
          isActive: true,
        };
        // const accountAdded = await Accounts.insertOne({
        //   _id: userId,
        //   firstName: user.firstName,
        //   lastName: user.lastName,
        //   name: user.firstName + " " + user.lastName,
        //   phone: user.phone,
        //   UserRole: user.UserRole
        // });
        const accountAdded = await Accounts.insertOne(account);
        console.log("before app event");
        await appEvents.emit("afterCreateUserAccount", {
          createdBy: userId,
          account,
        });

        // console.log("account Added:- ", accountAdded)
      }
      // if (userId) {
      //         const accountAdded = await Accounts.insertOne({ _id: userId, firstName: user.firstName, lastName: user.lastName, name: user.firstName + " " + user.lastName, phone: user.phone })

      // }
      // When initializing AccountsServer we check that enableAutologin and ambiguousErrorMessages options
      // are not enabled at the same time
      const createdUser = await accountsServer.findUserById(userId);
      // If we are here - user must be created successfully
      // Explicitly saying this to Typescript compiler

      const loginResult = await accountsServer.loginWithUser(
        createdUser,
        infos
      );
      // await generateOtp(user.phone);
      return {
        userId,
        loginResult,
      };
    } else if (user.UserRole === "admin") {
      if (!ctx.authToken) {
        throw new ReactionError("access-denied", "Please Login First");
      }
      if (ctx.user === undefined || ctx.user === null) {
        throw new ReactionError("access-denied", "Please Login First");
      }
      const GroupNameResp = await getGroupData(user.UserRole, Groups);
      const branchData = await BranchData.find({}).toArray();
      if (branchData) {
        AllBranchIDs = branchData.map((data) => data._id);
        user.branches = AllBranchIDs;
      }

      userId = await accountsPassword.createUser(user);
      if (!accountsServer.options.enableAutologin) {
        return {
          userId: accountsServer.options.ambiguousErrorMessages ? null : userId,
        };
      }
      if (userId) {
        const now = new Date();
        account = {
          _id: userId,
          acceptsMarketing: false,
          emails: [
            {
              address: user.email,
              verified: false,
              provides: "default",
            },
          ],
          groups: [GroupNameResp],
          name: user.firstName + " " + user.lastName,
          profile: {
            firstName: user.firstName,
            lastName: user.lastName,
            dob: user.dob,
            phone: user.phone,
          },
          shopId: "4N3s6SBCET5jn6RGf",
          state: "new",
          userId: userId,
          UserRole: user.UserRole,
          currentStatus: "online",
          createdAt: now,
          updatedAt: now,
          branches: user.branches,
          isActive: true,
        };
        await Accounts.insertOne(account);
        await appEvents.emit("afterCreateUserAccount", {
          createdBy: userId,
          account,
        });
      }
      // When initializing AccountsServer we check that enableAutologin and ambiguousErrorMessages options
      // are not enabled at the same time
      const createdUser = await accountsServer.findUserById(userId);
      // If we are here - user must be created successfully
      // Explicitly saying this to Typescript compiler
      const loginResult = await accountsServer.loginWithUser(
        createdUser,
        infos
      );
      // await appEvents.emit("afterUserCreate", {
      //   account,
      //   createdBy: userId
      // });
      return {
        userId,
        loginResult,
      };
    } else {
      if (!ctx.authToken) {
        throw new ReactionError("access-denied", "Please Login First");
      }
      if (ctx.user === undefined || ctx.user === null) {
        throw new ReactionError("access-denied", "Please Login First");
      }
      const UserPermission = canCreateUser(ctx.user.UserRole, user.UserRole);
      const GroupNameResp = await getGroupData(user.UserRole, Groups);
      if (UserPermission) {
        // Allow user creation
        try {
          userId = await accountsPassword.createUser(user);
        } catch (error) {
          // If ambiguousErrorMessages is true we obfuscate the email or username already exist error
          // to prevent user enumeration during user creation
          if (
            accountsServer.options.ambiguousErrorMessages &&
            error instanceof server_1.AccountsJsError &&
            (error.code === password_1.CreateUserErrors.EmailAlreadyExists ||
              error.code === password_1.CreateUserErrors.UsernameAlreadyExists)
          ) {
            return {};
          }
          throw error;
        }
        if (!accountsServer.options.enableAutologin) {
          return {
            userId: accountsServer.options.ambiguousErrorMessages
              ? null
              : userId,
          };
        }
        if (userId) {
          const now = new Date();
          const account = {
            _id: userId,
            acceptsMarketing: false,
            emails: [
              {
                address: user.email,
                verified: false,
                provides: "default",
              },
            ],
            groups: [GroupNameResp],
            name: user.firstName + " " + user.lastName,
            profile: {
              firstName: user.firstName,
              lastName: user.lastName,
              dob: user.dob,
              phone: user.phone,
            },
            shopId: "4N3s6SBCET5jn6RGf",
            state: "new",
            userId: userId,
            UserRole: user.UserRole,
            currentStatus: "online",
            createdAt: now,
            isActive: true,
          };
          const accountAdded = await Accounts.insertOne(account);
          await appEvents.emit("afterCreateUserAccount", {
            createdBy: userId,
            account,
          });
        }
        // When initializing AccountsServer we check that enableAutologin and ambiguousErrorMessages options
        // are not enabled at the same time
        const createdUser = await accountsServer.findUserById(userId);
        // If we are here - user must be created successfully
        // Explicitly saying this to Typescript compiler
        const loginResult = await accountsServer.loginWithUser(
          createdUser,
          infos
        );
        return {
          userId,
          loginResult,
        };
      } else {
        // Deny user creation
        throw new Error("Unauthorized");
      }
    }
  },
  changePassword: async (
    _,
    { oldPassword, newPassword },
    { user, injector }
  ) => {
    if (!(user && user.id)) {
      throw new Error("Unauthorized");
    }
    const userId = user.id;
    await injector
      .get(password_1.AccountsPassword)
      .changePassword(userId, oldPassword, newPassword);
    return null;
  },
  async createUserWithOtp(_, { user }, ctx) {
    const { injector, infos, collections } = ctx;
    const accountsServer = injector.get(server_1.AccountsServer);
    const accountsPassword = injector.get(password_1.AccountsPassword);
    const { Accounts, users } = collections;

    let userId;

    try {
      userId = await accountsPassword.createUser(user);
      if (userId) {
        const now = new Date();
        const account = {
          _id: userId,
          acceptsMarketing: false,
          emails: [
            {
              address: user.email,
              verified: false,
              provides: "default",
            },
          ],
          name: null,
          profile: {
            firstName: user.firstName,
            lastName: user.lastName,
            dob: user.dob,
            phone: user.phone,
          },
          shopId: "4N3s6SBCET5jn6RGf",
          state: "new",
          userId: userId,
          createdAt: now,
        };
        const accountAdded = await Accounts.insertOne(account);
        await appEvents.emit("afterCreateUserAccount", {
          createdBy: userId,
          account,
        });
      }
    } catch (error) {
      // If ambiguousErrorMessages is true we obfuscate the email or username already exist error
      // to prevent user enumeration during user creation
      if (
        accountsServer.options.ambiguousErrorMessages &&
        error instanceof server_1.AccountsJsError &&
        (error.code === password_1.CreateUserErrors.EmailAlreadyExists ||
          error.code === password_1.CreateUserErrors.UsernameAlreadyExists)
      ) {
        return {};
      }
      throw error;
    }
    if (!accountsServer.options.enableAutologin) {
      return {
        userId: accountsServer.options.ambiguousErrorMessages ? null : userId,
      };
    }

    const adminCount = await Accounts.findOne({
      "adminUIShopIds.0": { $ne: null },
    });
    if (userId && adminCount?._id) {
      const account = {
        _id: userId,
        acceptsMarketing: false,
        emails: [
          {
            address: user.email,
            verified: false,
            provides: "default",
          },
        ],
        groups: [],
        name: null,
        profile: {
          firstName: user.firstName,
          lastName: user.lastName,
          dob: user.dob,
          phone: user.phone,
        },
        shopId: "4N3s6SBCET5jn6RGf",
        state: "new",
        userId: userId,
      };
      const accountAdded = await Accounts.insertOne(account);
      await appEvents.emit("afterCreateUserAccount", {
        createdBy: userId,
        account,
      });
    }
    // When initializing AccountsServer we check that enableAutologin and ambiguousErrorMessages options
    // are not enabled at the same time
    const createdUser = await accountsServer.findUserById(userId);
    // If we are here - user must be created successfully
    // Explicitly saying this to Typescript compiler
    const loginResult = await accountsServer.loginWithUser(createdUser, infos);
    await generateOtp(user.phone);
    return {
      userId,
      // loginResult,
    };
  },
  authenticate: async (_, args, ctx) => {
    const { serviceName, params } = args;
    const { injector, infos, collections } = ctx;
    const { users, AllowedDomains } = collections;
    let discountDomains, customerDomain, userCheck, authenticated;
    let AllowedDomainsData = await AllowedDomains.findOne({});
    // console.log("AllowedDomainsData ", AllowedDomainsData?.domains);
    discountDomains = AllowedDomainsData?.domains;
    customerDomain = params?.user?.email?.split("@")[1];
    console.log("authenticate");
    authenticated = await injector
      .get(server_1.AccountsServer)
      .loginWithService(serviceName, params, infos);
    // console.log("authenticated", authenticated);
    if (discountDomains?.includes(customerDomain)) {
      console.log("customerDomain in if check");
      if (authenticated?.user?.emails[0].verified === true) {
        return authenticated;
      } else {
        console.log("in else check for sending otp for verification");
        await sendOTPToVerifyEmailOTP(ctx, params?.user?.email);
        // console.log("OtpSendResp", OtpSendResp);
        throw new ReactionError(
          "access-denied",
          "We have send you OTP for email verification, please verify email first, then login"
        );
      }
    } else {
      console.log("customerDomain in else check");
      return authenticated;
    }
  },
  authenticateWithOTP: async (_, args, ctx) => {
    const { serviceName, params } = args;
    const { injector, infos, collections } = ctx;
    const { users } = collections;
    const userExist = await users.findOne({
      "emails.0.address": params?.user?.email,
    });
    const resOTP = await verifyOTP(userExist.phone, params.code, ctx);
    if (!resOTP?.status) {
      return null;
    } else {
      const authenticated = await injector
        .get(server_1.AccountsServer)
        .loginWithService(serviceName, params, infos);
      return authenticated;
    }
  },
  async deleteUser(parent, args, context, info) {
    if (context.user === undefined || context.user === null) {
      throw new Error("Unauthorized access. Please login first");
    }
    if (!context.authToken) {
      throw new Error("Unauthorized");
    }

    const { users, Accounts } = context.collections;
    const { userId } = args;

    const query = { _id: ObjectID(userId) };

    const userAccountResponse = await Accounts.findOne({ _id: args.userId });
    if (
      userAccountResponse &&
      userAccountResponse.adminUIShopIds &&
      userAccountResponse.adminUIShopIds.length > 0
    ) {
      throw new Error("Cannot delete Super Admin");
    }
    const userResponse = await users.findOne({ _id: args.userId });
    if (!userResponse) {
      throw new Error(`User not found`);
    }
    const UserPermission = await canCreateUser(
      context.user.UserRole,
      userResponse.UserRole
    );
    if (UserPermission) {
      const deleteResult = await users.deleteOne({ _id: args.userId });
      const deleteAccountResult = await Accounts.deleteOne({
        _id: args.userId,
      });
      if (
        deleteResult.deletedCount > 0 ||
        deleteAccountResult.deletedCount > 0
      ) {
        return true; // User deleted successfully, return true
      } else {
        return false;
      }
    } else {
      // Deny user creation
      throw new Error("Unauthorized");
    }
    return UserPermission;
  },
};
