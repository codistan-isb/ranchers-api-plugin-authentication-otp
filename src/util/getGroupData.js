export async function getGroupData(GroupName, Groups) {

    // console.log("Group Name : ", GroupName)
    // console.log(Groups)
    if (GroupName === 'dispatcher') {
        const GroupDataResp = await Groups.findOne({ name: GroupName });
        // console.log("Group Data Resp: ", GroupDataResp._id)
        return GroupDataResp._id;
    }
    if (GroupName === 'admin') {
        const GroupDataResp = await Groups.findOne({ name: "branch admin" });
        // console.log("Group Data Resp: ", GroupDataResp._id)
        return GroupDataResp._id;
    }
}
