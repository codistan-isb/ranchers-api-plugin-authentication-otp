
export default {

        async  firstName (parent, args, context, info){
            const {collections}=context;
            const {users}=collections;
            const userObj=await users.findOne({"_id":context.userId})
            return userObj.firstName;
        }
        ,
        async lastName (parent, args, context, info){
            const {collections}=context;
            const {users}=collections;
            const userObj=await users.findOne({"_id":context.userId})
            return userObj.lastName;
        },
        async  phone (parent, args, context, info){
            const {collections}=context;
            const {users}=collections;
            const userObj=await users.findOne({"_id":context.userId})
            return userObj.phone;
        }

}