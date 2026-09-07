const calendar = require('../services/googleCalendarService');

function createCalendarController(service = calendar) {
  return {
    getEvents: async (req, res, next) => {
      try {
        const data = await service.getEventsWithAlerts();
        res.set('Cache-Control', 'private, no-store');
        res.status(200).json({ success: true, ...data });
      } catch (error) { next(error); }
    },
    syncCalendar: async (req, res, next) => {
      try {
        const data = await service.syncWithGoogleCalendar();
        res.set('Cache-Control', 'private, no-store');
        const success = data.sync.status === 'synced';
        res.status(success ? 200 : data.sync.configured ? 502 : 503).json({ success, message: data.sync.message, ...data });
      } catch (error) { next(error); }
    },
    createEvent: (req, res) => res.status(405).json({ success: false, message: '일정은 구글 캘린더에서 등록해주세요. 등록한 일정은 자동으로 반영됩니다.' }),
    deleteEvent: (req, res) => res.status(405).json({ success: false, message: '일정은 구글 캘린더에서 삭제해주세요. 삭제한 일정은 자동으로 반영됩니다.' }),
  };
}

module.exports = { ...createCalendarController(), createCalendarController };