
import { generateOtp } from '../util/otp.js'
import { verifyOTP } from '../util/otp.js'

import password_1 from "@accounts/password";
import server_1 from "@accounts/server";

export default {
        async sendOTP(parent, args, context, info) {
                console.log("sendOTP")
                const res = await generateOtp(args.phone);
                console.log("res", res);
                return true;
        },
        verifyOTP(parent, args, context, info) {
                return verifyOTP(args.phone, args.otp, context);

        },
        async createUser(_, { user }, ctx) {

                const { injector, infos, collections } = ctx;
                const { Accounts } = collections;
                const accountsServer = injector.get(server_1.AccountsServer);
                const accountsPassword = injector.get(password_1.AccountsPassword);
                let userId;
                try {
                        userId = await accountsPassword.createUser(user);
                }
                catch (error) {
                        // If ambiguousErrorMessages is true we obfuscate the email or username already exist error
                        // to prevent user enumeration during user creation
                        if (accountsServer.options.ambiguousErrorMessages &&
                                error instanceof server_1.AccountsJsError &&
                                (error.code === password_1.CreateUserErrors.EmailAlreadyExists ||
                                        error.code === password_1.CreateUserErrors.UsernameAlreadyExists)) {
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
                        const accountAdded = await Accounts.insertOne({ _id: userId, firstName: user.firstName, lastName: user.lastName, name: user.firstName + " " + user.lastName, phone: user.phone })

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
                        loginResult,
                };
        },
        authenticate: async (_, args, ctx) => {
                const { serviceName, params } = args;
                const { injector, infos, collections } = ctx;
                const { users } = collections;
                const userExist = await users.findOne({ "emails.0.address": params?.user?.email })
                console.log(userExist)
                if (userExist.phoneVerified) {
                        const authenticated = await injector
                                .get(server_1.AccountsServer)
                                .loginWithService(serviceName, params, infos);
                        return authenticated;
                }
                else {
                        console.log("userExist", userExist)
                        return { user: { id: userExist?._id, ...userExist } }
                }
        },
}