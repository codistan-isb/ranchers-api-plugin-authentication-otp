export async function getGroupData(GroupName, Groups) {

    if (GroupName === 'dispatcher') {
        const GroupDataResp = await Groups.findOne({ name: GroupName });
        return GroupDataResp._id;
    }
    if (GroupName === 'admin') {
        const GroupDataResp = await Groups.findOne({ name: "branch admin" });
        return GroupDataResp._id;
    }
}
