export const check = (board: string[][]) => {
    for (const row of board) {
        const rowStr = row.join()
        if (rowStr.includes('w,w,w,w,w')) return 'w'
        if (rowStr.includes('b,b,b,b,b')) return 'b'
    }
    for (let col = 0; col < board.length; ++col) {
        let colStr = ''
        for (const row of board) {
            colStr += row[col]
        }
        if (colStr.includes('wwwww')) return 'w'
        if (colStr.includes('bbbbb')) return 'b'
    }
    for (let i = 0; i < board.length; ++i) {
        let row = i;
        let col = 0;
        let diagnalStr = ''
        while (row < board.length && col < board.length) {
            diagnalStr += board[row][col]
            row += 1
            col += 1
        }
        if (diagnalStr.includes('wwwww')) return 'w'
        if (diagnalStr.includes('bbbbb')) return 'b'

        row = 0;
        col = i;
        diagnalStr = ''
        while (row < board.length && col < board.length) {
            diagnalStr += board[row][col]
            row += 1
            col += 1
        }
        if (diagnalStr.includes('wwwww')) return 'w'
        if (diagnalStr.includes('bbbbb')) return 'b'

        row = i;
        col = 0;
        diagnalStr = ''
        while (row > -1 && col< board.length ) {
            diagnalStr += board[row][col]
            row -= 1
            col += 1
        }
        if (diagnalStr.includes('wwwww')) return 'w'
        if (diagnalStr.includes('bbbbb')) return 'b'

        row = board.length-1;
        col = i;
        diagnalStr = ''
        while (row > -1 && col< board.length ) {
            diagnalStr += board[row][col]
            row -= 1
            col += 1
        }
        if (diagnalStr.includes('wwwww')) return 'w'
        if (diagnalStr.includes('bbbbb')) return 'b'
    }

    return 'd'
}