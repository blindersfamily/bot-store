// require needed discord.js classes
const { Client, Events, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs'); // لإدارة الملفات (قاعدة بيانات JSON)

// replace with your token
const token = 'MTM0NTQ3OTE1MjE0MDI4ODAyMA.G23cwM.xnmsNlYmkXyK8_uf6Tfq3N092Xo9R8wjMecmaw';
// replace with your user id
const adminId = '1174731979388887050';
// replace with your server id
const serverId = '1329863402042036224';
// replace with your channel id that you want the bot to send the embed to.
const channelIdToSendEmbed = '1344384411725992007';
// replace with your channel id that you want the bot to send the user to when they press the button.
const channelIdToSendUser = '1331378753003065404';
// replace with your channel id that you want the bot to send messages when a role is added or removed.
const logChannelId = '1345477707764469911';

// create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// قاعدة بيانات الرتب المؤقتة
let tempRoles = {};
try {
    tempRoles = JSON.parse(fs.readFileSync('tempRoles.json', 'utf8'));
} catch (error) {
    console.error('Error reading tempRoles.json:', error);
}

function saveTempRoles() {
    fs.writeFileSync('tempRoles.json', JSON.stringify(tempRoles));
}

// when the client is ready, run this code (once)
// we use 'c' for the client parameter to be consistent with the event parameter
client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    const channel = c.channels.cache.get(channelIdToSendEmbed);
    if (channel) {
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setImage('https://a.top4top.io/p_3347dx7fx1.png');

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('buy_role')
                    .setPlaceholder('شراء رتبة')
                    .addOptions(
                        {
                            label: 'شراء رتبة',
                            value: 'buy_role',
                        },
                    ),
            );

        channel.send({ embeds: [embed], components: [row] });
    }

    // تسجيل الأوامر عند تشغيل البوت
    const guild = c.guilds.cache.get(serverId);
    if (guild) {
        guild.commands.set([
            {
                name: 'منح_رتبة_مؤقتة',
                description: 'منح رتبة مؤقتة لمستخدم',
                options: [
                    {
                        name: 'المستخدم',
                        description: 'المستخدم',
                        type: 6,
                        required: true,
                    },
                    {
                        name: 'الرتبة',
                        description: 'الرتبة',
                        type: 8,
                        required: true,
                    },
                    {
                        name: 'المدة',
                        description: 'المدة',
                        type: 3,
                        required: true,
                        choices: [
                            { name: 'ثواني', value: 'seconds' },
                            { name: 'دقائق', value: 'minutes' },
                            { name: 'ساعات', value: 'hours' },
                            { name: 'أيام', value: 'days' },
                        ],
                    },
                    {
                        name: 'العدد',
                        description: 'عدد المدة',
                        type: 4,
                        required: true,
                    },
                ],
            },
        ]);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'buy_role') {
            const channel = interaction.guild.channels.cache.get(channelIdToSendUser);
            if (channel) {
                interaction.reply({ content: `تم توجيهك إلى <#${channelIdToSendUser}> لفتح تذكرة شراء رتبة.`, ephemeral: true });
            }
        }
    }
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'منح_رتبة_مؤقتة') {
        const user = interaction.options.getUser('المستخدم');
        const role = interaction.options.getRole('الرتبة');
        const durationType = interaction.options.getString('المدة');
        const durationAmount = interaction.options.getInteger('العدد');

        if (interaction.user.id !== adminId) {
            return interaction.reply({ content: 'تنبيه لا تملك صلاحية.', ephemeral: true });
        }
        if (interaction.guild.id !== serverId) {
            return interaction.reply({ content: 'هذا الامر مخصص لهذا السيرفر فقط', ephemeral: true });
        }

        let durationSeconds = 0;
        switch (durationType) {
            case 'seconds':
                durationSeconds = durationAmount;
                break;
            case 'minutes':
                durationSeconds = durationAmount * 60;
                break;
            case 'hours':
                durationSeconds = durationAmount * 60 * 60;
                break;
            case 'days':
                durationSeconds = durationAmount * 60 * 60 * 24;
                break;
        }

        try {
            await interaction.guild.members.cache.get(user.id).roles.add(role);
            interaction.reply({ content: `تم منح ${user} رتبة ${role} لمدة ${durationAmount} ${durationType}.`, ephemeral: true });

            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                logChannel.send(`تم منح ${user} رتبة ${role} لمدة ${durationAmount} ${durationType}.`);
            }

            tempRoles[user.id] = tempRoles[user.id] || {};
            tempRoles[user.id][role.id] = Date.now() + durationSeconds * 1000;
            saveTempRoles();

            setTimeout(async () => {
                try {
                    await interaction.guild.members.cache.get(user.id).roles.remove(role);
                    if (logChannel) {
                        logChannel.send(`تمت إزالة رتبة ${role} من ${user} بعد انتهاء المدة.`);
                    }
                    delete tempRoles[user.id][role.id];
                    if (Object.keys(tempRoles[user.id]).length === 0) {
                        delete tempRoles[user.id];
                    }
                    saveTempRoles();
                } catch (error) {
                    console.error('Error removing role:', error);
                }
            }, durationSeconds * 1000);
        } catch (error) {
            console.error('Error adding role:', error);
            interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
        }
    }
});

// log in to discord with your client's token
client.login(token);